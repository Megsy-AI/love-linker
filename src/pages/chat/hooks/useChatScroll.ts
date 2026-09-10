import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import type { Message } from "../chatConstants";

/**
 * Encapsulates the chat-transcript scroll behavior:
 *   - `handleScroll`: toggles the floating "scroll to bottom" button and
 *     clears the unread counter when the user is back near the bottom.
 *   - `scrollToBottom`: smoothly jumps to the latest message.
 *   - auto-scroll on the user's own outgoing messages.
 *   - smart pinning during assistant streaming (ChatGPT-style).
 */
export function useChatScroll(params: {
  messages: Message[];
  isLoading: boolean;
  messagesContainerRef: MutableRefObject<HTMLDivElement | null>;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  setShowScrollBtn: (next: boolean) => void;
  setNewMessagesCount: (next: number | ((prev: number) => number)) => void;
}) {
  const {
    messages,
    isLoading,
    messagesContainerRef,
    messagesEndRef,
    setShowScrollBtn,
    setNewMessagesCount,
  } = params;
  void messagesEndRef;
  const pinnedToBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottomRef.current = distFromBottom < 120;
    setShowScrollBtn(distFromBottom > 200);
    if (distFromBottom < 100) setNewMessagesCount(0);
  }, [messagesContainerRef, setShowScrollBtn, setNewMessagesCount]);

  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    pinnedToBottomRef.current = true;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setNewMessagesCount(0);
  }, [messagesContainerRef, setNewMessagesCount]);

  const lastMsgCountRef = useRef(0);

  // Auto-scroll only on the user's own new message, not during streaming.
  useEffect(() => {
    const prevCount = lastMsgCountRef.current;
    lastMsgCountRef.current = messages.length;
    if (
      messages.length > prevCount &&
      messages.length > 0 &&
      messages[messages.length - 1].role === "user"
    ) {
      pinnedToBottomRef.current = true;
      const frame = requestAnimationFrame(() => {
        const el = messagesContainerRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [messages.length, messagesContainerRef]);

  // Keep a reply pinned only while the user remains near the bottom. A manual
  // upward scroll releases the pin immediately, so streaming never fights the
  // user's touch gesture or makes the transcript feel frozen.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || !isLoading) return;
    const content = el.firstElementChild;
    if (!(content instanceof HTMLElement)) return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (!pinnedToBottomRef.current) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [isLoading, messagesContainerRef]);

  return { handleScroll, scrollToBottom };
}
