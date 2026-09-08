import { useState, useRef, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  LogIn,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/lib/chat-history";
import { groupSessionsByDate } from "@/lib/chat-history";

interface ChatSidebarProps {
  open: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  user: { displayName: string; email: string } | null;
  onSelectSession: (session: ChatSession) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

// Navbar height = h-11 = 44px
const NAV_H = 44;

// Apple §4 drawer easing: iOS drawer curve — ease-in on open, ease-out on close
// damping ~0.8 / response 0.3 → cubic-bezier(0.32, 0.72, 0, 1)
const DRAWER_OPEN  = "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)";
const DRAWER_CLOSE = "transform 260ms cubic-bezier(0.4, 0, 1, 1)";

export function ChatSidebar({
  open,
  onToggle,
  sessions,
  activeSessionId,
  user,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onOpenAuth,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const groups = groupSessionsByDate(sessions);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  function startEdit(session: ChatSession, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title);
    setConfirmDeleteId(null);
  }

  function commitEdit() {
    if (editingId && editValue.trim()) {
      onRenameSession(editingId, editValue.trim());
    }
    setEditingId(null);
  }

  function handleDeleteClick(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmDeleteId === sessionId) {
      onDeleteSession(sessionId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(sessionId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }

  return (
    <>
      {/*
        Apple §12: Backdrop is a translucent scrim — not opaque black.
        It fades in/out with opacity only (no transform), matching the
        "dim to focus" principle. Only on mobile.
      */}
      <div
        aria-hidden
        className="fixed inset-0 z-30 sm:hidden"
        style={{
          top: NAV_H,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          // Apple §3: animate from current value (opacity)
          transition: "opacity 250ms ease, visibility 0ms linear",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          // Pointer events only when visible
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onToggle}
      />

      {/*
        Toggle button.
        Apple §7: enters/exits along the same spatial path as the sidebar.
        Apple §1: responds on pointer-down (active:scale-[0.92]).
        Position transitions with the same drawer easing.
      */}
      <button
        onClick={onToggle}
        aria-label={open ? "Tutup riwayat chat" : "Buka riwayat chat"}
        style={{
          top: NAV_H + 10,
          left: open ? 264 : 12,
          transition: `left 320ms cubic-bezier(0.32, 0.72, 0, 1)`,
        }}
        className="fixed z-50 flex size-8 items-center justify-center rounded-full border border-border/60 bg-surface/95 text-muted-foreground shadow-sm backdrop-blur-md hover:bg-surface hover:text-foreground hover:shadow-md active:scale-[0.92] active:transition-none"
      >
        {/*
          Apple §7: icon cross-dissolves in-place — same spatial position,
          different state. Rotate + scale on exit, not a spatial jump.
        */}
        <span
          style={{
            display: "block",
            transition: "opacity 150ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
            opacity: open ? 1 : 0,
            transform: open ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.7)",
            position: open ? "relative" : "absolute",
          }}
        >
          <ChevronLeft className="size-4" />
        </span>
        <span
          style={{
            display: "block",
            transition: "opacity 150ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
            opacity: open ? 0 : 1,
            transform: open ? "rotate(90deg) scale(0.7)" : "rotate(0deg) scale(1)",
            position: open ? "absolute" : "relative",
          }}
        >
          <ChevronRight className="size-4" />
        </span>
      </button>

      {/*
        Sidebar panel.
        Apple §7: enter from left, exit to left — symmetric path.
        Apple §4: iOS drawer spring (cubic-bezier(0.32, 0.72, 0, 1) open,
        faster ease-in on close).
        Apple §12: translucent material — backdrop-filter + semi-transparent bg.
      */}
      <aside
        data-sidebar
        style={{
          top: NAV_H,
          height: `calc(100dvh - ${NAV_H}px)`,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: open ? DRAWER_OPEN : DRAWER_CLOSE,
        }}
        className="fixed left-0 z-40 flex w-[272px] flex-col border-r border-border/40 bg-surface/90 shadow-2xl backdrop-blur-xl"
      >
        {/* New Chat — Apple §1: dashed border signals affordance without clutter */}
        <div className="px-3 pt-4 pb-1">
          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-2.5 rounded-[14px] border border-dashed border-border/70 bg-background/40 px-3.5 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.98] active:transition-none"
          >
            <Plus className="size-4 shrink-0" />
            Chat Baru
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 floating-scrollbar">
          {groups.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <MessageSquare className="size-8 text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground/50">
                Belum ada percakapan.
                <br />
                Mulai dengan Chat Baru!
              </p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              {/* Apple §15: section labels: tight tracking, small caps */}
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/40">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const isEditing = editingId === session.id;
                  const isConfirmingDelete = confirmDeleteId === session.id;

                  return (
                    <div
                      key={session.id}
                      onClick={() => !isEditing && onSelectSession(session)}
                      className={cn(
                        // Apple §1: pointer-down instant scale (active:scale-[0.98])
                        "group relative flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors duration-100 active:scale-[0.98] active:transition-none",
                        isActive
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                          : "text-foreground/65 hover:bg-secondary/50 hover:text-foreground",
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "size-3.5 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground/40",
                        )}
                      />

                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 rounded bg-background px-1 py-0.5 text-[13px] outline-none ring-1 ring-primary/40"
                          maxLength={80}
                        />
                      ) : (
                        <span className="flex-1 truncate leading-snug">{session.title}</span>
                      )}

                      {!isEditing && (
                        <div
                          className={cn(
                            "ml-auto flex shrink-0 items-center gap-0.5",
                            // Apple §3: show controls only when needed (hover/active)
                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                            "transition-opacity duration-100",
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => startEdit(session, e)}
                            aria-label="Rename percakapan"
                            className="grid size-6 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 active:transition-none"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(session.id, e)}
                            aria-label={isConfirmingDelete ? "Konfirmasi hapus" : "Hapus percakapan"}
                            className={cn(
                              "grid size-6 place-items-center rounded-lg transition-colors duration-100 active:scale-90 active:transition-none",
                              isConfirmingDelete
                                ? "bg-destructive/10 text-destructive"
                                : "text-muted-foreground hover:bg-secondary hover:text-destructive",
                            )}
                          >
                            {isConfirmingDelete ? <Check className="size-3" /> : <Trash2 className="size-3" />}
                          </button>
                          {isConfirmingDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              className="grid size-6 place-items-center rounded-lg text-muted-foreground hover:bg-secondary active:scale-90 active:transition-none"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: CTA login — only for guests */}
        {!user && (
          <div className="shrink-0 border-t border-border/30 p-3">
            {/*
              Apple §12: semi-transparent surface on top of the blurred sidebar.
              Don't stack two light translucent layers — use a subtle tinted bg.
            */}
            <div className="space-y-2 rounded-xl bg-primary/6 p-3 ring-1 ring-primary/12">
              <div className="flex items-center gap-2">
                <User className="size-3.5 shrink-0 text-primary/60" />
                <p className="text-[12px] font-medium text-foreground/75">
                  Simpan riwayat ke akun
                </p>
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground/60">
                Masuk agar percakapan tersimpan di semua perangkat.
              </p>
              <button
                onClick={onOpenAuth}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[12.5px] font-semibold text-white shadow-sm shadow-primary/20 transition-opacity hover:opacity-90 active:scale-[0.98] active:transition-none"
              >
                <LogIn className="size-3.5" />
                Masuk / Daftar
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
