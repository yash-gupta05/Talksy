import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { Send, Search, Users, ChevronDown, Image } from "lucide-react";

// Mock contacts for the sidebar preview
const PREVIEW_CONTACTS = [
  {
    id: 1,
    name: "Emma Thompson",
    initial: "E",
    preview: "Are we still on for tomorrow?",
    time: "12:04 PM",
    unread: 2,
    online: true,
    active: true,
  },
  {
    id: 2,
    name: "James Anderson",
    initial: "J",
    preview: "You: Sounds good, thanks!",
    time: "Yesterday",
    unread: 0,
    online: true,
    active: false,
  },
  {
    id: 3,
    name: "Olivia Miller",
    initial: "O",
    preview: "📷 Photo",
    time: "Mon",
    unread: 0,
    online: false,
    active: false,
  },
];

// Mock messages for the chat preview
const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false, time: "11:58 AM" },
  { id: 2, content: "Great! Just shipping some new features.", isSent: true, time: "11:59 AM" },
  { id: 3, content: "Nice! Are we still on for tomorrow?", isSent: false, time: "12:03 PM", firstUnread: true },
  { id: 4, content: "Let me know what time works.", isSent: false, time: "12:04 PM" },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="min-h-screen container mx-auto px-4 pt-20 pb-10 max-w-5xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">
            Choose a theme for your chat interface
          </p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)}
            >
              <div
                className="relative h-8 w-full rounded-md overflow-hidden"
                data-theme={t}
              >
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>
                  <div className="rounded bg-accent"></div>
                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Preview Section */}
        <h3 className="text-lg font-semibold mb-3">Preview</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200">
            <div className="max-w-3xl mx-auto">
              {/* Mock app window */}
              <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden flex h-[380px]">
                {/* ---------- Sidebar ---------- */}
                <div className="w-20 sm:w-56 border-r border-base-300 flex flex-col shrink-0">
                  {/* Sidebar header */}
                  <div className="p-3 border-b border-base-300">
                    <div className="flex items-center gap-2">
                      <Users className="size-5" />
                      <span className="font-medium text-sm hidden sm:block">
                        Contacts
                      </span>
                    </div>
                    <div className="mt-2 relative hidden sm:block">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-base-content/50" />
                      <input
                        type="text"
                        readOnly
                        placeholder="Search contacts..."
                        className="input input-bordered input-xs w-full pl-8"
                      />
                    </div>
                  </div>

                  {/* Contact list */}
                  <div className="flex-1 overflow-hidden py-1">
                    {PREVIEW_CONTACTS.map((c) => (
                      <div
                        key={c.id}
                        className={`
                          w-full p-2.5 flex items-center gap-2.5
                          ${c.active ? "bg-base-300" : ""}
                        `}
                      >
                        <div className="relative mx-auto sm:mx-0 shrink-0">
                          <div className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
                            {c.initial}
                          </div>
                          {c.online && (
                            <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-base-100" />
                          )}
                          {c.unread > 0 && (
                            <span className="absolute -top-1 -right-1 size-2.5 bg-primary rounded-full sm:hidden" />
                          )}
                        </div>

                        <div className="hidden sm:flex flex-col flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium truncate">
                              {c.name}
                            </span>
                            <span
                              className={`text-[10px] shrink-0 ${
                                c.unread > 0
                                  ? "text-primary font-medium"
                                  : "text-base-content/50"
                              }`}
                            >
                              {c.time}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[11px] truncate ${
                                c.unread > 0
                                  ? "font-medium"
                                  : "text-base-content/60"
                              }`}
                            >
                              {c.preview}
                            </span>
                            {c.unread > 0 && (
                              <span className="badge badge-primary badge-xs shrink-0">
                                {c.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ---------- Chat area ---------- */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Chat header */}
                  <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium text-sm">
                        E
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Emma Thompson</h3>
                        <p className="text-xs text-base-content/70">Online</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="relative flex-1 overflow-hidden">
                    <div className="p-4 space-y-3 h-full overflow-y-auto bg-base-100">
                      {PREVIEW_MESSAGES.map((message) => (
                        <div key={message.id} className="space-y-3">
                          {message.firstUnread && (
                            <div className="flex items-center gap-2 py-0.5">
                              <div className="flex-1 h-px bg-primary/40" />
                              <span className="text-[10px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                                2 unread messages
                              </span>
                              <div className="flex-1 h-px bg-primary/40" />
                            </div>
                          )}
                          <div
                            className={`flex ${
                              message.isSent ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`
                                max-w-[80%] rounded-xl p-2.5 shadow-sm
                                ${
                                  message.isSent
                                    ? "bg-primary text-primary-content"
                                    : "bg-base-200"
                                }
                              `}
                            >
                              <p className="text-xs">{message.content}</p>
                              <p
                                className={`
                                  text-[10px] mt-1
                                  ${
                                    message.isSent
                                      ? "text-primary-content/70"
                                      : "text-base-content/70"
                                  }
                                `}
                              >
                                {message.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Jump-to-bottom arrow */}
                    <div className="absolute bottom-3 right-4 btn btn-circle btn-primary btn-sm shadow-lg pointer-events-none">
                      <ChevronDown className="size-4" />
                      <span className="absolute -top-2 -right-1 badge badge-secondary badge-xs">
                        2
                      </span>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-base-300 bg-base-100">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered flex-1 text-sm h-9"
                          placeholder="Type a message..."
                          value="This is a preview"
                          readOnly
                        />
                        <button
                          type="button"
                          className="hidden sm:flex btn btn-circle btn-sm h-9 w-9 min-h-0 text-zinc-400 pointer-events-none"
                          aria-label="Attach image"
                        >
                          <Image size={18} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-circle btn-primary h-9 w-9 min-h-0 pointer-events-none"
                        aria-label="Send"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;