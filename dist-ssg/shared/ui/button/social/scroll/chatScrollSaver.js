const DEFAULT_ROW_SELECTOR = '[data-chat-message-row="true"]';
const isElementConnected = (element) => !!element && !!element.isConnected;
export class ChatScrollSaver {
    container;
    rowSelector;
    reverse;
    scrollHeight = 0;
    scrollTop = 0;
    scrollHeightMinusTop = 0;
    scrolledToEnd = true;
    rows = [];
    constructor(container, options) {
        this.container = container;
        this.rowSelector = options?.rowSelector || DEFAULT_ROW_SELECTOR;
        this.reverse = options?.reverse ?? true;
    }
    getAnchor() {
        if (this.rows.length === 0) {
            return undefined;
        }
        return this.rows[this.reverse ? 0 : this.rows.length - 1];
    }
    findVisibleRows() {
        const rowElements = Array.from(this.container.querySelectorAll(this.rowSelector));
        if (rowElements.length === 0) {
            return [];
        }
        const containerRect = this.container.getBoundingClientRect();
        const visibleRows = [];
        for (const rowElement of rowElements) {
            const rowId = rowElement.id;
            if (!rowId) {
                continue;
            }
            const rowRect = rowElement.getBoundingClientRect();
            if (rowRect.bottom <= containerRect.top) {
                continue;
            }
            if (rowRect.top >= containerRect.bottom) {
                if (visibleRows.length > 0) {
                    break;
                }
                continue;
            }
            visibleRows.push({
                rowId,
                element: rowElement,
                rect: rowRect,
            });
        }
        if (visibleRows.length === 0) {
            const fallback = rowElements[0];
            if (!fallback?.id) {
                return [];
            }
            return [
                {
                    rowId: fallback.id,
                    element: fallback,
                    rect: fallback.getBoundingClientRect(),
                },
            ];
        }
        return visibleRows;
    }
    restoreByScrollHeight() {
        const nextScrollTop = this.reverse
            ? this.container.scrollHeight - this.scrollHeightMinusTop
            : this.scrollHeightMinusTop;
        this.container.scrollTop = nextScrollTop;
    }
    save() {
        this.rows = this.findVisibleRows();
        this.scrollTop = this.container.scrollTop;
        this.scrollHeight = this.container.scrollHeight;
        this.scrollHeightMinusTop = this.reverse
            ? this.scrollHeight - this.scrollTop
            : this.scrollTop;
        this.scrolledToEnd =
            this.container.scrollHeight -
                Math.ceil(this.container.scrollTop + this.container.clientHeight) <=
                1;
    }
    restore() {
        if (this.rows.length === 0) {
            this.restoreByScrollHeight();
            return;
        }
        let anchor = this.getAnchor();
        const savedAnchorRect = anchor?.rect;
        if (!isElementConnected(anchor?.element)) {
            const nextRows = this.findVisibleRows();
            if (nextRows.length > 0) {
                this.rows = nextRows;
            }
            anchor = this.getAnchor();
        }
        if (!anchor || !isElementConnected(anchor.element)) {
            const anchorId = anchor?.rowId;
            if (anchorId) {
                const byId = document.getElementById(anchorId);
                if (byId instanceof HTMLElement && byId.closest('[data-chat-scroll-container="true"]')) {
                    anchor = {
                        rowId: anchorId,
                        element: byId,
                        rect: savedAnchorRect || byId.getBoundingClientRect(),
                    };
                }
            }
        }
        if (!anchor || !isElementConnected(anchor.element)) {
            this.restoreByScrollHeight();
            return;
        }
        const containerRect = this.container.getBoundingClientRect();
        const previousRect = anchor.rect;
        const nextRect = anchor.element.getBoundingClientRect();
        const isOverflowingTop = previousRect.top < containerRect.top;
        const isOverflowingBottom = previousRect.bottom > containerRect.bottom;
        let positionKey = this.reverse ? 'top' : 'bottom';
        if (this.reverse
            ? isOverflowingTop && !isOverflowingBottom
            : isOverflowingBottom && !isOverflowingTop) {
            positionKey = this.reverse ? 'bottom' : 'top';
        }
        let previousPosition = previousRect[positionKey];
        const nextPosition = nextRect[positionKey];
        const modifiedHeight = previousRect.height - nextRect.height;
        if (isOverflowingTop && isOverflowingBottom && modifiedHeight > 0) {
            previousPosition = containerRect[positionKey];
        }
        if (nextPosition === previousPosition && !this.scrolledToEnd) {
            return;
        }
        const delta = nextPosition - previousPosition;
        if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) {
            return;
        }
        this.container.scrollTop = this.container.scrollTop + delta;
    }
}
export const withChatScrollTransaction = (mutate, options) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        mutate();
        return;
    }
    const container = options?.container ||
        document.querySelector('[data-chat-scroll-container="true"]');
    if (!container) {
        mutate();
        return;
    }
    const saver = new ChatScrollSaver(container, {
        reverse: options?.reverse ?? true,
        rowSelector: options?.rowSelector || DEFAULT_ROW_SELECTOR,
    });
    saver.save();
    mutate();
    const frames = Math.max(1, Math.min(3, options?.frames ?? 2));
    let frameIndex = 0;
    const restore = () => {
        saver.restore();
        saver.save();
        frameIndex += 1;
        if (frameIndex < frames) {
            window.requestAnimationFrame(restore);
        }
    };
    window.requestAnimationFrame(restore);
};
