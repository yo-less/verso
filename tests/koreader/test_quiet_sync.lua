-- Exercise the actual plugin with small KOReader API stubs; no device or network required.
local base = "koreader/plugins/cwasync.koplugin/"
local now, connected = 100, true
local popups, network_requests, pushes, pulls, scheduled, blocking = 0, 0, 0, 0, 0, 0
local pending, push_callback
local defer_push = false
local UI = {
    getElapsedTimeSinceBoot = function() return now end,
    show = function() popups = popups + 1 end,
    nextTick = function(_, callback) callback() end,
    scheduleIn = function(_, delay, callback) scheduled = scheduled + 1; pending = callback; assert(delay > 0) end,
    unschedule = function() pending = nil end,
}
local network = {
    isConnected = function() return connected end,
    willRerunWhenOnline = function() network_requests = network_requests + 1; return false end,
}
local client = {
    new = function(self) return self end,
    update_progress = function(_, user, pass, digest, progress, percent, model, id, callback, flush)
        pushes = pushes + 1
        if flush then blocking = blocking + 1 end
        if defer_push and not flush then
            push_callback = callback
        else
            callback(true, {})
        end
    end,
    get_progress = function(_, user, pass, digest, callback)
        pulls = pulls + 1
        callback(true, {percentage = .5, progress = "new", device = "other", device_id = "other", timestamp = 999})
    end,
}
local widget = {new = function(_, v) return v end}
package.loaded["ui/widget/confirmbox"] = widget
package.loaded["ui/widget/infomessage"] = widget
package.loaded["ui/widget/container/widgetcontainer"] = {extend = function(_, t) return t end}
package.loaded["ui/uimanager"] = UI
package.loaded["ui/network/manager"] = network
package.loaded["ui/time"] = {s = function(n) return n end}
package.loaded["ui/event"] = widget
package.loaded["ui/widget/multiinputdialog"] = widget
package.loaded["device"] = {model = "test"}
package.loaded["dispatcher"] = {}
package.loaded["logger"] = {dbg = function() end, warn = function() end}
package.loaded["json"] = {}
package.loaded["optmath"] = {roundPercent = function(n) return n end}
package.loaded["ffi/sha2"] = {md5 = function() end}
package.loaded["random"] = {}
package.loaded["util"] = {}
package.loaded["ffi/util"] = {template = function(v) return v end}
package.loaded["gettext"] = function(v) return v end
package.loaded["bit"] = {}
package.loaded["CWASyncClient"] = client
local settings_store = {}
G_reader_settings = {
    hasNot = function() return false end,
    readSetting = function(_, key) return settings_store[key] end,
    saveSetting = function(_, key, value) settings_store[key] = value end,
}
local plugin = dofile(base .. "main.lua")
local document = {file = "test.epub"}
local position = "first"
local moved = 0
local self = setmetatable({
    settings = {username = "test", password = "test", server = "http://localhost",
                auto_sync = true, pages_before_update = 2, sync_forward = 2, sync_backward = 3},
    ui = {document = document}, view = {document = document}, path = base,
    last_page_turn_timestamp = 1, last_page = 0, page_update_counter = 0,
    push_generation = 0, device_id = "test",
    getDocumentDigest = function() return "test" end,
    getLastProgress = function() return position end,
    getLastPercent = function() return .25 end,
    pushAnnotations = function() end, pullAnnotations = function() end,
    syncStatistics = function() end,
    syncToProgress = function() moved = moved + 1 end,
}, {__index = plugin})
self.periodic_push_task = function()
    self.periodic_push_scheduled = false
    self.page_update_counter = 0
    self:updateProgress(false, false)
end
-- Offline automatic requests are skipped and never ask to turn Wi-Fi on.
connected = false
self:updateProgress(true, false)
self:getProgress(true, false)
assert(pushes == 0 and pulls == 0 and network_requests == 0 and popups == 0)
connected = true
self:getProgress(false, false)
self:getProgress(false, false)
assert(pulls == 1 and moved == 1 and popups == 0)
self:updateProgress(false, false)
position = "second"
now = 110
self:updateProgress(false, false)
assert(pushes == 1 and popups == 0)
now = 160
self:updateProgress(false, false)
assert(pushes == 2)
now = 220
self:updateProgress(false, false)
assert(pushes == 2, "unchanged progress must not be uploaded")
-- Many page turns create one timer; the final flush cancels it.
self:_onPageUpdate(1)
self:_onPageUpdate(2)
self:_onPageUpdate(3)
assert(scheduled == 1 and pending)
position = "third"
self:_onSuspend()
assert(pending == nil and pushes == 3 and blocking == 1)
self:_onNetworkDisconnecting()
assert(pushes == 3 and popups == 0, "duplicate lifecycle events must not resend")
-- Explicit manual action is still allowed to use the network and show feedback.
self:onCWASyncPushProgress()
assert(pushes == 4 and network_requests == 1 and popups == 1)
-- An unfinished async upload does not allow periodic overlapping requests.
defer_push = true
position = "fourth"
now = 300
self:updateProgress(false, false)
assert(pushes == 5 and push_callback)
now = 370
self:updateProgress(false, false)
assert(pushes == 5)
-- A final flush can send the current position even while the old upload is in flight.
position = "fifth"
self:_onSuspend()
assert(pushes == 6 and blocking == 2)
push_callback(true, {})
defer_push = false
now = 430
self:updateProgress(false, false)
assert(pushes == 6, "late callback must not overwrite the final flush state")
-- Stats cooldown is device-wide, including closing and reopening different books.
local stats_calls = 0
local statistics = {
    settings = {is_enabled = true, sync_server = {}},
    ui = {cloudstorage = {sync = function() end}},
    onSyncBookStats = function(_, interactive)
        stats_calls = stats_calls + 1
        if interactive then popups = popups + 1 end
    end,
}
local function statsReader()
    return setmetatable({
        settings = {sync_stats = true},
        applyStatsServer = function() return statistics end,
    }, {__index = plugin})
end
statsReader():syncStatistics(false)
statsReader():syncStatistics(false)
assert(stats_calls == 1 and popups == 1)
statsReader():syncStatistics(true)
assert(stats_calls == 2 and popups == 2)
settings_store.cwasync_last_stats_attempt = os.time() - 601
statsReader():syncStatistics(false)
assert(stats_calls == 3 and popups == 2)
print("Quiet KOReader sync behavior passed")
