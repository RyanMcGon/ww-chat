<template>
    <div class="ww-chat-input-area">
        <!-- Pending Attachments Display -->
        <div v-if="pendingAttachments.length > 0 && !editingMessage" class="ww-chat-input-area__attachments">
            <div
                v-for="(attachment, index) in pendingAttachments"
                :key="attachment.id"
                class="ww-chat-input-area__attachment"
                @click="onPendingAttachmentClick(attachment, index)"
            >
                <!-- File info display (for all file types) -->
                <div class="ww-chat-input-area__attachment-file">
                    <div class="ww-chat-input-area__attachment-icon">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                        </svg>
                    </div>
                    <div class="ww-chat-input-area__attachment-info">
                        <div class="ww-chat-input-area__attachment-name">{{ attachment.name }}</div>
                        <div class="ww-chat-input-area__attachment-size">{{ formatFileSize(attachment.size) }}</div>
                    </div>
                </div>

                <!-- Remove button -->
                <button
                    class="ww-chat-input-area__attachment-remove"
                    @click.stop="removeAttachment(index)"
                    :title="'Remove ' + attachment.name"
                    :style="{ color: removeIconColor }"
                >
                    <span
                        class="ww-chat-input-area__icon"
                        :style="{ width: removeIconSize, height: removeIconSize }"
                        v-html="removeIconHtml"
                    ></span>
                </button>
            </div>
        </div>

        <div class="ww-chat-input-area__input-row" :style="{ alignItems: alignItemsCss }">
            <!-- Attachment button -->
            <label
                v-if="allowAttachments && !editingMessage"
                class="ww-chat-input-area__attachment-btn"
                :class="{ 'ww-chat-input-area__attachment-btn--disabled': isUiDisabled }"
                :style="attachmentButtonStyle"
            >
                <input
                    type="file"
                    class="ww-chat-input-area__attachment-input"
                    multiple
                    @change="handleAttachment"
                    :disabled="isUiDisabled"
                />
                <span
                    class="ww-chat-input-area__icon"
                    :style="{ width: attachmentIconSize, height: attachmentIconSize }"
                    v-html="attachmentIconHtml"
                ></span>
            </label>

            <!-- Input field -->
            <div class="ww-chat-input-area__input-container" :style="richSizingStyle">
                <div v-if="allowRichText" class="ww-chat-input-area__toolbar">
                    <button
                        type="button"
                        class="ww-chat-input-area__toolbar-btn"
                        :disabled="isUiDisabled"
                        @mousedown.prevent
                        @click="applyFormat('bold')"
                        title="Bold"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        type="button"
                        class="ww-chat-input-area__toolbar-btn"
                        :disabled="isUiDisabled"
                        @mousedown.prevent
                        @click="applyFormat('italic')"
                        title="Italic"
                    >
                        <em>I</em>
                    </button>
                    <button
                        type="button"
                        class="ww-chat-input-area__toolbar-btn"
                        :disabled="isUiDisabled"
                        @mousedown.prevent
                        @click="applyFormat('strike')"
                        title="Strikethrough"
                    >
                        <span class="ww-chat-input-area__toolbar-strike">S</span>
                    </button>
                    <button
                        type="button"
                        class="ww-chat-input-area__toolbar-btn"
                        :disabled="isUiDisabled"
                        @mousedown.prevent
                        @click="applyFormat('bullet')"
                        title="Bullet list"
                    >
                        •
                    </button>
                    <button
                        type="button"
                        class="ww-chat-input-area__toolbar-btn"
                        :disabled="isUiDisabled"
                        @mousedown.prevent
                        @click="applyFormat('link')"
                        title="Insert link"
                    >
                        🔗
                    </button>
                </div>

                <div
                    v-if="allowRichText"
                    ref="richInputRef"
                    class="ww-chat-input-area__rich-input"
                    :class="{ 'ww-chat-input-area__rich-input--disabled': isUiDisabled }"
                    :data-placeholder="placeholder"
                    contenteditable="true"
                    @input="handleRichInput"
                    @keydown="handleRichKeyDown"
                    @keyup="updateRichSelection"
                    @mouseup="updateRichSelection"
                ></div>

                <textarea
                    v-else
                    ref="textareaRef"
                    v-model="inputValue"
                    class="ww-chat-input-area__input"
                    :placeholder="placeholder"
                    :disabled="isUiDisabled"
                    :style="inputStyles"
                    @keydown="onEnterKey"
                    @input="handleRawInput"
                    @keydown.capture="handleKeyDown"
                    @keyup="updateSelection"
                    @click="updateSelection"
                    @select="updateSelection"
                ></textarea>

                <!-- Mentions dropdown -->
                <div
                    v-if="showMentionsDropdown"
                    class="ww-chat-input-area__mentions-dropdown"
                    :style="mentionsDropdownStyle"
                >
                    <div
                        v-for="(participant, index) in filteredParticipants"
                        :key="participant.id"
                        class="ww-chat-input-area__mention-item"
                        :class="{ 'ww-chat-input-area__mention-item--selected': index === selectedMentionIndex }"
                        @click="selectMention(participant)"
                        @mouseenter="selectedMentionIndex = index"
                    >
                        <div v-if="participant.avatar" class="ww-chat-input-area__mention-avatar">
                            <img :src="participant.avatar" :alt="participant.name" />
                        </div>
                        <div v-else class="ww-chat-input-area__mention-avatar-initials">
                            {{ getInitials(participant.name) }}
                        </div>
                        <div class="ww-chat-input-area__mention-info">
                            <div class="ww-chat-input-area__mention-name">{{ participant.name }}</div>
                            <div v-if="participant.location" class="ww-chat-input-area__mention-location">
                                {{ participant.location }}
                            </div>
                        </div>
                    </div>
                    <div v-if="filteredParticipants.length === 0" class="ww-chat-input-area__mention-empty">
                        No participants found
                    </div>
                </div>
            </div>

            <!-- Cancel button (when editing) -->
            <button
                v-if="editingMessage"
                type="button"
                class="ww-chat-input-area__cancel-btn"
                :disabled="isUiDisabled"
                @click="handleCancelEdit"
            >
                Cancel
            </button>

            <!-- Send button -->
            <button
                type="button"
                class="ww-chat-input-area__send-btn"
                :class="{ 'ww-chat-input-area__send-btn--disabled': !canSend || isUiDisabled }"
                :disabled="!canSend || isUiDisabled"
                :style="sendButtonStyle"
                @click="sendMessage"
            >
                <span
                    class="ww-chat-input-area__icon"
                    :style="{ width: sendIconSize, height: sendIconSize }"
                    v-html="sendIconHtml"
                ></span>
            </button>
        </div>
    </div>
</template>

<script>
import { ref, computed, watch, nextTick, inject, watchEffect, onMounted } from 'vue';
import { formatRichText } from '../utils/richTextFormatter';

const getFrontWindow = () => {
    try {
        return wwLib?.getFrontWindow ? wwLib.getFrontWindow() : window;
    } catch (error) {
        return window;
    }
};

const getFrontDocument = () => {
    try {
        return wwLib?.getFrontDocument ? wwLib.getFrontDocument() : document;
    } catch (error) {
        return document;
    }
};

const convertHtmlToMarkdown = (html) => {
    const doc = document.createElement('div');
    doc.innerHTML = html || '';

    const MARKER_ORDER = ['~~', '**', '*'];

    const hasMeaningfulText = (value) => {
        if (value == null) return false;
        return value.replace(/[\s\u200B\u00A0]+/g, '') !== '';
    };

    const mergeMarkers = (base = [], additions = []) => {
        const set = new Set([...base, ...additions]);
        return MARKER_ORDER.filter(marker => set.has(marker));
    };

    const getMarkersFromNode = (node) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return [];

        const markers = [];
        const tag = node.tagName.toLowerCase();

        if (tag === 'strong' || tag === 'b') markers.push('**');
        if (tag === 'em' || tag === 'i') markers.push('*');
        if (tag === 's' || tag === 'strike') markers.push('~~');

        const style = (node.getAttribute && (node.getAttribute('style') || '')).toLowerCase();
        if (style) {
            if (/\bline-through\b/.test(style) || /text-decoration(?:-line)?\s*:\s*[^;]*line-through/.test(style)) {
                markers.push('~~');
            }
            if (/font-weight\s*:\s*(bold|[5-9]00)/.test(style)) {
                markers.push('**');
            }
            if (/font-style\s*:\s*italic/.test(style)) {
                markers.push('*');
            }
        }

        return MARKER_ORDER.filter(marker => markers.includes(marker));
    };

    const wrapWithMarkers = (text, markers = []) => {
        if (!text || markers.length === 0) return text;
        return markers.reduce((acc, marker) => `${marker}${acc}${marker}`, text);
    };

    const walkNodes = (node, activeMarkers = []) => {
        if (!node) return '';

        if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue || '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        if (node.classList?.contains('ww-message-item__mention')) {
            return node.textContent || '';
        }

        if (node.classList?.contains('ww-rt-break')) {
            return '\n';
        }

        const tag = node.tagName.toLowerCase();
        const nodeMarkers = getMarkersFromNode(node);
        const combinedMarkers = mergeMarkers(activeMarkers, nodeMarkers);

        switch (tag) {
            case 'br':
                return '\n';
            case 'a': {
                const href = node.getAttribute('href') || '';
                const label = Array.from(node.childNodes)
                    .map(child => walkNodes(child, combinedMarkers))
                    .join('') || href;
                return href ? `[${label}](${href})` : label;
            }
            case 'li': {
                const liContent = Array.from(node.childNodes)
                    .map(child => walkNodes(child, combinedMarkers))
                    .join('')
                    .trim();
                return liContent ? `- ${liContent}\n` : '';
            }
            case 'ul':
            case 'ol':
            case 'div':
            case 'p': {
                const block = Array.from(node.childNodes)
                    .map(child => walkNodes(child, combinedMarkers))
                    .join('');
                if (!block) return '';

                const newMarkers = nodeMarkers.filter(marker => !activeMarkers.includes(marker));
                const wrapped = hasMeaningfulText(block) ? wrapWithMarkers(block, newMarkers) : block;
                return `${wrapped}\n`;
            }
            default: {
                const content = Array.from(node.childNodes)
                    .map(child => walkNodes(child, combinedMarkers))
                    .join('');

                if (!hasMeaningfulText(content)) {
                    return content;
                }

                const newMarkers = nodeMarkers.filter(marker => !activeMarkers.includes(marker));
                return wrapWithMarkers(content, newMarkers);
            }
        }
    };

    const markdown = Array.from(doc.childNodes)
        .map(child => walkNodes(child, []))
        .join('');
    const plainText = doc.textContent || '';

    return {
        markdown: markdown.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trimEnd(),
        plainText: plainText.replace(/\u00a0/g, ' '),
    };
};

export default {
    name: 'InputArea',
    props: {
        modelValue: {
            type: String,
            default: '',
        },
        participants: {
            type: Array,
            default: () => [],
        },
        currentUserId: {
            type: String,
            default: '',
        },
        actionAlign: { type: String, default: 'end' },
        sendButtonBgColor: { type: String, default: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
        sendButtonHoverBgColor: { type: String, default: 'linear-gradient(135deg, #2563eb, #1d4ed8)' },
        sendButtonBorder: { type: String, default: 'none' },
        sendButtonBorderRadius: { type: String, default: '12px' },
        sendButtonSize: { type: String, default: '42px' },
        sendButtonBoxShadow: { type: String, default: '0 2px 4px rgba(59, 130, 246, 0.3)' },
        attachmentButtonBgColor: { type: String, default: '#f8fafc' },
        attachmentButtonHoverBgColor: { type: String, default: '#f1f5f9' },
        attachmentButtonBorder: { type: String, default: '1px solid #e2e8f0' },
        attachmentButtonBorderRadius: { type: String, default: '12px' },
        attachmentButtonSize: { type: String, default: '42px' },
        attachmentButtonBoxShadow: { type: String, default: '0 1px 2px rgba(0, 0, 0, 0.06)' },
        isDisabled: {
            type: Boolean,
            default: false,
        },
        allowAttachments: {
            type: Boolean,
            default: false,
        },
        pendingAttachments: {
            type: Array,
            default: () => [],
        },
        inputBgColor: {
            type: String,
            default: '#ffffff',
        },
        inputTextColor: {
            type: String,
            default: '#334155',
        },
        inputFontSize: {
            type: String,
            default: '0.875rem',
        },
        inputFontWeight: {
            type: String,
            default: '400',
        },
        inputFontFamily: {
            type: String,
            default: 'inherit',
        },
        inputPlaceholderColor: {
            type: String,
            default: '#94a3b8',
        },
        inputAreaBorder: {
            type: String,
            default: '1px solid #e2e8f0',
        },
        textareaBorder: {
            type: String,
            default: '1px solid #e2e8f0',
        },
        textareaBorderHover: {
            type: String,
            default: '1px solid #cbd5e1',
        },
        textareaBorderFocus: {
            type: String,
            default: '1px solid #3b82f6',
        },
        inputHeight: {
            type: String,
            default: '38px',
        },
        inputBorderRadius: {
            type: String,
            default: '20px',
        },
        inputMaxHeight: {
            type: String,
            default: '260px',
        },
        placeholder: {
            type: String,
            default: 'Type a message...',
        },
        sendIcon: {
            type: String,
            default: 'send',
        },
        sendIconColor: {
            type: String,
            default: '#334155',
        },
        sendIconSize: {
            type: String,
            default: '20px',
        },
        attachmentIcon: {
            type: String,
            default: 'paperclip',
        },
        attachmentIconColor: {
            type: String,
            default: '#334155',
        },
        attachmentIconSize: {
            type: String,
            default: '20px',
        },
        removeIcon: {
            type: String,
            default: 'x',
        },
        removeIconColor: {
            type: String,
            default: '#f43f5e',
        },
        removeIconSize: {
            type: String,
            default: '12px',
        },
        mentionsColor: {
            type: String,
            default: '#3b82f6',
        },
        mentionsBgColor: {
            type: String,
            default: '#dbeafe',
        },
        allowRichText: {
            type: Boolean,
            default: true,
        },
        editingMessage: {
            type: Object,
            default: null,
        },
    },
    emits: ['update:modelValue', 'send', 'attachment', 'remove-attachment', 'pending-attachment-click', 'cancel-edit'],
    setup(props, { emit }) {
        const isEditing = inject(
            'isEditing',
            computed(() => false)
        );
        const textareaRef = ref(null);
        const richInputRef = ref(null);
        const inputValue = ref(props.modelValue);
        const plainTextValue = ref(props.modelValue || '');
        const sendIconText = ref(null);
        const attachmentIconText = ref(null);
        const removeIconText = ref(null);
        const selectionRange = ref({ start: 0, end: 0 });
        const isSyncingRich = ref(false);
        const savedRichRange = ref(null);

        const richSizingStyle = computed(() => ({
            '--rich-input-min-height': props.inputHeight || '38px',
            '--rich-input-max-height': props.inputMaxHeight || '160px',
        }));

        const textareaMaxHeight = computed(() => {
            if (!props.inputMaxHeight) return 160;
            const parsed = parseInt(props.inputMaxHeight, 10);
            return Number.isFinite(parsed) ? parsed : 160;
        });

        const adjustTextareaHeight = () => {
            if (props.allowRichText || !textareaRef.value) return;
            const textarea = textareaRef.value;
            textarea.style.height = 'auto';
            const targetHeight = Math.min(textarea.scrollHeight, textareaMaxHeight.value);
            textarea.style.height = `${targetHeight}px`;
            textarea.style.overflowY = textarea.scrollHeight > textareaMaxHeight.value ? 'auto' : 'hidden';
        };

        const focusTextarea = () => {
            if (props.allowRichText) {
                if (richInputRef.value) richInputRef.value.focus();
                return;
            }
            if (textareaRef.value) {
                textareaRef.value.focus();
            }
        };

        const captureCurrentRichRange = () => {
            if (!props.allowRichText || !richInputRef.value) return;
            const frontWindow = getFrontWindow();
            const selection = frontWindow.getSelection?.();
            if (selection && selection.rangeCount > 0) {
                try {
                    savedRichRange.value = selection.getRangeAt(0).cloneRange();
                } catch (error) {
                    savedRichRange.value = null;
                }
            }
        };

        const restoreSavedRichRange = () => {
            if (!props.allowRichText || !richInputRef.value) return;
            const frontWindow = getFrontWindow();
            const selection = frontWindow.getSelection?.();
            if (!selection) return;

            selection.removeAllRanges();

            if (savedRichRange.value) {
                try {
                    selection.addRange(savedRichRange.value.cloneRange());
                    return;
                } catch (error) {
                    savedRichRange.value = null;
                }
            }

            const doc = getFrontDocument();
            const fallbackRange = doc.createRange();
            fallbackRange.selectNodeContents(richInputRef.value);
            fallbackRange.collapse(false);
            selection.addRange(fallbackRange);
            savedRichRange.value = fallbackRange.cloneRange();
        };

        const applyManualInlineFormat = (tagName) => {
            if (!props.allowRichText || !richInputRef.value) return false;

            const doc = getFrontDocument();
            const frontWindow = getFrontWindow();
            const selection = frontWindow.getSelection?.();
            if (!selection || selection.rangeCount === 0) return false;

            const range = selection.getRangeAt(0);
            if (!range || !richInputRef.value.contains(range.commonAncestorContainer) || range.collapsed) {
                return false;
            }

            const wrapper = doc.createElement(tagName);
            const content = range.extractContents();
            wrapper.appendChild(content);
            range.insertNode(wrapper);

            const newRange = doc.createRange();
            newRange.selectNodeContents(wrapper);
            selection.removeAllRanges();
            selection.addRange(newRange);

            captureCurrentRichRange();
            return true;
        };

        const updateSelection = () => {
            if (textareaRef.value) {
                selectionRange.value = {
                    start: textareaRef.value.selectionStart ?? 0,
                    end: textareaRef.value.selectionEnd ?? 0,
                };
            }
        };

        const updateRichSelection = () => {
            if (!props.allowRichText || !richInputRef.value) return;
            const frontWindow = getFrontWindow();
            const selection = frontWindow.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const range = selection.getRangeAt(0);
            captureCurrentRichRange();
            const preRange = range.cloneRange();
            preRange.selectNodeContents(richInputRef.value);
            preRange.setEnd(range.endContainer, range.endOffset);
            const caret = preRange.toString().length;
            processMentionState(plainTextValue.value, caret);
        };

        const showMentionsDropdown = ref(false);
        const mentionSearchText = ref('');
        const mentionStartPos = ref(-1);
        const selectedMentionIndex = ref(0);
        const mentions = ref([]);

        const { getIcon } = wwLib.useIcons();

        const defaultSendIcon = `<svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>`;

        const defaultAttachmentIcon = `<svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path
                d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
            ></path>
        </svg>`;

        const defaultRemoveIcon = `<svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;

        watchEffect(async () => {
            try {
                if (props.sendIcon) {
                    sendIconText.value = await getIcon(props.sendIcon);
                }
            } catch (error) {
                sendIconText.value = null;
            }
        });

        watchEffect(async () => {
            try {
                if (props.attachmentIcon) {
                    attachmentIconText.value = await getIcon(props.attachmentIcon);
                }
            } catch (error) {
                attachmentIconText.value = null;
            }
        });

        watchEffect(async () => {
            try {
                if (props.removeIcon) {
                    removeIconText.value = await getIcon(props.removeIcon);
                }
            } catch (error) {
                removeIconText.value = null;
            }
        });

        const sendIconHtml = computed(() => {
            return sendIconText.value || defaultSendIcon;
        });

        const attachmentIconHtml = computed(() => {
            return attachmentIconText.value || defaultAttachmentIcon;
        });

        const removeIconHtml = computed(() => {
            return removeIconText.value || defaultRemoveIcon;
        });

        const canSend = computed(() => {
            const text = props.allowRichText ? plainTextValue.value : inputValue.value;
            return text.trim().length > 0 || props.pendingAttachments.length > 0;
        });
        const isUiDisabled = computed(() => props.isDisabled || isEditing.value);

        const alignItemsCss = computed(() => {
            if (props.actionAlign === 'start') return 'flex-start';
            if (props.actionAlign === 'center') return 'center';
            return 'flex-end';
        });

        const sendButtonStyle = computed(() => ({
            color: props.sendIconColor,
            background: props.sendButtonBgColor,
            border: props.sendButtonBorder,
            borderRadius: props.sendButtonBorderRadius,
            width: props.sendButtonSize,
            height: props.sendButtonSize,
            boxShadow: props.sendButtonBoxShadow,
            '--btn-hover-bg': props.sendButtonHoverBgColor,
        }));

        const attachmentButtonStyle = computed(() => ({
            color: props.attachmentIconColor,
            background: props.attachmentButtonBgColor,
            border: props.attachmentButtonBorder,
            borderRadius: props.attachmentButtonBorderRadius,
            width: props.attachmentButtonSize,
            height: props.attachmentButtonSize,
            boxShadow: props.attachmentButtonBoxShadow,
            '--btn-hover-bg': props.attachmentButtonHoverBgColor,
        }));

        const syncRichEditor = (preserveCaret = true) => {
            if (!props.allowRichText || !richInputRef.value) return;
            const caret = preserveCaret ? getCaretOffsetFromRich() : plainTextValue.value.length;
            isSyncingRich.value = true;
            const html = formatRichText(
                inputValue.value || '',
                mentions.value,
                true,
                props.mentionsColor,
                props.mentionsBgColor
            );
            richInputRef.value.innerHTML = html || '';
            plainTextValue.value = richInputRef.value.textContent?.replace(/\u00a0/g, ' ') || '';
            nextTick(() => {
                setCaretOffsetInRich(caret);
                isSyncingRich.value = false;
            });
        };

        watch(
            () => props.modelValue,
            newValue => {
                inputValue.value = newValue || '';
                if (!props.allowRichText) {
                    plainTextValue.value = inputValue.value;
                    nextTick(() => {
                        const textarea = textareaRef.value;
                        if (textarea) {
                            const frontDoc = getFrontDocument();
                            const isFocused = frontDoc?.activeElement === textarea;
                            const caretPos = isFocused
                                ? textarea.selectionEnd ?? inputValue.value.length
                                : inputValue.value.length;
                            if (!isFocused) {
                                textarea.setSelectionRange(caretPos, caretPos);
                            }
                            updateSelection();
                            adjustTextareaHeight();
                            processMentionState(plainTextValue.value, caretPos);
                        } else {
                            processMentionState(plainTextValue.value, plainTextValue.value.length);
                        }
                    });
                } else {
                    syncRichEditor();
                    nextTick(() => {
                        const richInput = richInputRef.value;
                        if (richInput) {
                            const frontDoc = getFrontDocument();
                            const isFocused = frontDoc?.activeElement === richInput;
                            const caretPos = isFocused ? getCaretOffsetFromRich() : plainTextValue.value.length;
                            if (!isFocused) {
                                setCaretOffsetInRich(plainTextValue.value.length);
                            }
                            processMentionState(plainTextValue.value, caretPos);
                        } else {
                            processMentionState(plainTextValue.value, plainTextValue.value.length);
                        }
                    });
                }
            }
        );

        watch(
            () => props.editingMessage,
            (newMessage) => {
                if (newMessage) {
                    inputValue.value = newMessage.text || '';
                    if (props.allowRichText) {
                        syncRichEditor(false);
                        nextTick(() => {
                            if (richInputRef.value) {
                                focusTextarea();
                                setCaretOffsetInRich(plainTextValue.value.length);
                                processMentionState(plainTextValue.value, plainTextValue.value.length);
                            }
                        });
                    } else {
                        plainTextValue.value = inputValue.value;
                        nextTick(() => {
                            if (textareaRef.value) {
                                textareaRef.value.focus();
                                const length = inputValue.value.length;
                                textareaRef.value.setSelectionRange(length, length);
                                updateSelection();
                                adjustTextareaHeight();
                            }
                            processMentionState(plainTextValue.value, plainTextValue.value.length);
                        });
                    }
                }
            },
            { immediate: true }
        );

        watch(inputValue, newValue => {
            emit('update:modelValue', newValue);
        });

        onMounted(() => {
            nextTick(() => {
                if (props.allowRichText) {
                    syncRichEditor(false);
                } else {
                    adjustTextareaHeight();
                }
            });
        });

        const onEnterKey = event => {
            if (isEditing.value) return;

            if (props.allowRichText) {
                updateRichSelection();
                if (showMentionsDropdown.value && !event.shiftKey) {
                    event.preventDefault();
                    return;
                }
                if (event.shiftKey) return;
                event.preventDefault();
                if (!props.isDisabled && canSend.value) {
                    sendMessage();
                }
                return;
            }

            updateSelection();
            if (showMentionsDropdown.value && !event.shiftKey) {
                event.preventDefault();
                return;
            }
            if (event.shiftKey) return;
            if (!props.isDisabled) {
                event.preventDefault();
                if (canSend.value) {
                    sendMessage();
                }
            }
        };

        const sendMessage = () => {
            if (isEditing.value || !canSend.value || props.isDisabled) return;

            emit('send', mentions.value);
            inputValue.value = '';
            plainTextValue.value = '';
            mentions.value = [];
            showMentionsDropdown.value = false;
            selectionRange.value = { start: 0, end: 0 };
            if (props.allowRichText && richInputRef.value) {
                richInputRef.value.innerHTML = '';
            } else if (textareaRef.value) {
                textareaRef.value.value = '';
                adjustTextareaHeight();
            }
        };

        const availableParticipants = computed(() => {
            const mentionedIds = new Set(mentions.value.map(m => m.id).filter(Boolean));
            const mentionedNames = new Set(
                mentions.value.map(m => m.name?.toLowerCase?.()).filter(Boolean)
            );

            return (props.participants || []).filter(p => {
                if (!p) return false;
                const participantId = p.id;
                if (participantId && mentionedIds.has(participantId)) return false;
                const participantName = (p.name || '').toLowerCase();
                if (participantName && mentionedNames.has(participantName)) return false;
                return participantId !== props.currentUserId;
            });
        });

        const filteredParticipants = computed(() => {
            if (!mentionSearchText.value) return availableParticipants.value;
            const search = mentionSearchText.value.toLowerCase();
            return availableParticipants.value.filter(p => 
                p?.name?.toLowerCase().includes(search)
            );
        });

        const mentionsDropdownStyle = computed(() => ({
            bottom: '100%',
            marginBottom: '8px',
        }));

        const getInitials = (name) => {
            if (!name) return '?';
            return name
                .split(' ')
                .map(part => part.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2);
        };

        const handleRawInput = (event) => {
            const textarea = textareaRef.value;
            if (!textarea) return;
            const text = event.target.value ?? '';
            inputValue.value = text;
            plainTextValue.value = text;
            const cursorPos = textarea.selectionStart ?? text.length;
            processMentionState(text, cursorPos);
            updateSelection();
            adjustTextareaHeight();
        };

        const handleRichInput = () => {
            if (!props.allowRichText || !richInputRef.value || isSyncingRich.value) return;
            const caret = getCaretOffsetFromRich();
            const html = richInputRef.value.innerHTML;
            const { markdown, plainText } = convertHtmlToMarkdown(html);
            inputValue.value = markdown;
            plainTextValue.value = plainText;
            processMentionState(plainText, caret);
            captureCurrentRichRange();
        };

        const handleRichKeyDown = (event) => {
            if (event.key === 'Enter') {
                onEnterKey(event);
                return;
            }
            if (showMentionsDropdown.value) {
                handleKeyDown(event);
            }
        };

        const getCaretOffsetFromRich = () => {
            const win = getFrontWindow();
            const selection = win.getSelection();
            if (!selection || selection.rangeCount === 0 || !richInputRef.value) {
                return plainTextValue.value.length;
            }
            const range = selection.getRangeAt(0);
            const preRange = range.cloneRange();
            preRange.selectNodeContents(richInputRef.value);
            preRange.setEnd(range.endContainer, range.endOffset);
            return preRange.toString().length;
        };

        const setCaretOffsetInRich = (offset) => {
            if (!props.allowRichText || !richInputRef.value) return;
            const doc = getFrontDocument();
            const win = getFrontWindow();
            const selection = win.getSelection();
            if (!selection) return;

            let remaining = Math.max(0, Math.min(offset, plainTextValue.value.length));
            const walker = doc.createTreeWalker(richInputRef.value, NodeFilter.SHOW_TEXT, null);
            let node = walker.nextNode();
            let foundNode = null;
            let nodeOffset = 0;

            while (node) {
                const nodeLength = node.nodeValue?.length ?? 0;
                if (remaining <= nodeLength) {
                    foundNode = node;
                    nodeOffset = remaining;
                    break;
                }
                remaining -= nodeLength;
                node = walker.nextNode();
            }

            if (!foundNode) {
                foundNode = richInputRef.value;
                nodeOffset = richInputRef.value.childNodes?.length || 0;
            }

            const range = doc.createRange();
            if (foundNode.nodeType === Node.TEXT_NODE) {
                range.setStart(foundNode, nodeOffset);
            } else {
                range.selectNodeContents(foundNode);
                range.collapse(false);
            }
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            captureCurrentRichRange();
        };

        const processMentionState = (text, cursorPos) => {
            const safeText = text ?? '';
            plainTextValue.value = safeText;
            const textBeforeCursor = safeText.substring(0, cursorPos);
            const lastAtIndex = textBeforeCursor.lastIndexOf('@');

            if (lastAtIndex !== -1) {
                const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
                if (!/\s/.test(textAfterAt)) {
                    mentionStartPos.value = lastAtIndex;
                    mentionSearchText.value = textAfterAt;
                    showMentionsDropdown.value = true;
                    selectedMentionIndex.value = 0;
                    checkRemovedMentions();
                    return;
                }
            }

            showMentionsDropdown.value = false;
            mentionSearchText.value = '';
            mentionStartPos.value = -1;
            checkRemovedMentions();
        };

        const checkRemovedMentions = () => {
            const text = plainTextValue.value || '';
            mentions.value = mentions.value.filter(mention => {
                const mentionText = `@${mention.name}`;
                return text.includes(mentionText);
            });
        };

        const insertFormatting = (prefix, suffix, placeholder = '') => {
            if (isUiDisabled.value || !textareaRef.value) return;

            const text = inputValue.value || '';
            let { start, end } = selectionRange.value;
            if (start > end) {
                const temp = start;
                start = end;
                end = temp;
            }

            const selectedText = text.slice(start, end) || placeholder;
            const newText = `${text.slice(0, start)}${prefix}${selectedText}${suffix}${text.slice(end)}`;
            const newCursorStart = start + prefix.length;
            const newCursorEnd = newCursorStart + selectedText.length;

            inputValue.value = newText;
            plainTextValue.value = newText.replace(/[*_~`]/g, '');

            nextTick(() => {
                if (!textareaRef.value) return;
                focusTextarea();
                textareaRef.value.setSelectionRange(newCursorStart, newCursorEnd);
                updateSelection();
                checkRemovedMentions();
                processMentionState(plainTextValue.value, newCursorEnd);
            });
        };

        const applyRichFormat = (format) => {
            if (!props.allowRichText || !richInputRef.value) return;
            const doc = getFrontDocument();
            const win = getFrontWindow();

            focusTextarea();
            restoreSavedRichRange();

            let executed = false;

            if (format === 'bold') {
                const before = richInputRef.value.innerHTML;
                executed = doc.execCommand('bold');
                if (!executed || richInputRef.value.innerHTML === before) {
                    executed = applyManualInlineFormat('strong');
                }
            } else if (format === 'italic') {
                const before = richInputRef.value.innerHTML;
                const result = doc.execCommand('italic');
                executed = result;
                if (!result || richInputRef.value.innerHTML === before) {
                    executed = applyManualInlineFormat('em') || executed;
                }
            } else if (format === 'strike') {
                const before = richInputRef.value.innerHTML;
                const result = doc.execCommand('strikeThrough');
                executed = result;
                if (!result || richInputRef.value.innerHTML === before) {
                    executed = applyManualInlineFormat('s') || executed;
                }
            } else if (format === 'bullet') {
                executed = doc.execCommand('insertUnorderedList');
            } else if (format === 'link') {
                const promptFn = win?.prompt ? win.prompt.bind(win) : undefined;
                const url = promptFn ? promptFn('Enter URL', 'https://') : undefined;
                if (url) {
                    executed = doc.execCommand('createLink', false, url);
                }
            }

            if (executed) {
                captureCurrentRichRange();
            }

            handleRichInput();
        };

        const applyFormat = (format) => {
            if (props.allowRichText) {
                applyRichFormat(format);
                return;
            }

            if (isUiDisabled.value) return;
            if (!textareaRef.value) return;

            updateSelection();

            if (format === 'bold') {
                insertFormatting('**', '**', 'bold text');
                return;
            }
            if (format === 'italic') {
                insertFormatting('*', '*', 'italic text');
                return;
            }
            if (format === 'strike') {
                insertFormatting('~~', '~~', 'strikethrough');
                return;
            }
            if (format === 'bullet') {
                const text = inputValue.value || '';
                let { start, end } = selectionRange.value;
                if (start > end) {
                    const temp = start;
                    start = end;
                    end = temp;
                }
                const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                if (text.slice(lineStart, lineStart + 2) === '- ') {
                    focusTextarea();
                    return;
                }
                const newText = `${text.slice(0, lineStart)}- ${text.slice(lineStart)}`;
                const offset = 2;
                inputValue.value = newText;
                plainTextValue.value = newText.replace(/[*_~`]/g, '');
                const newStart = start + offset;
                const newEnd = end + offset;
                nextTick(() => {
                    if (!textareaRef.value) return;
                    focusTextarea();
                    textareaRef.value.setSelectionRange(newStart, newEnd);
                    updateSelection();
                    checkRemovedMentions();
                    processMentionState(plainTextValue.value, newEnd);
                });
                return;
            }
            if (format === 'link') {
                const frontWindow = getFrontWindow();
                const promptFn = frontWindow?.prompt ? frontWindow.prompt.bind(frontWindow) : undefined;
                const url = promptFn ? promptFn('Enter URL', 'https://') : undefined;
                if (!url) {
                    focusTextarea();
                    return;
                }

                const text = inputValue.value || '';
                let { start, end } = selectionRange.value;
                if (start > end) {
                    const temp = start;
                    start = end;
                    end = temp;
                }
                const selectedText = text.slice(start, end) || 'link text';
                const markdown = `[${selectedText}](${url})`;
                const newText = `${text.slice(0, start)}${markdown}${text.slice(end)}`;
                const labelStart = start + 1;
                const labelEnd = labelStart + selectedText.length;

                inputValue.value = newText;
                plainTextValue.value = newText.replace(/[*_~`\[\]]/g, '');

                nextTick(() => {
                    if (!textareaRef.value) return;
                    focusTextarea();
                    textareaRef.value.setSelectionRange(labelStart, labelEnd);
                    updateSelection();
                    checkRemovedMentions();
                    processMentionState(plainTextValue.value, labelEnd);
                });
                return;
            }
        };

        const handleKeyDown = (event) => {
            if (!showMentionsDropdown.value) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                selectedMentionIndex.value = Math.min(
                    selectedMentionIndex.value + 1,
                    filteredParticipants.value.length - 1
                );
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                selectedMentionIndex.value = Math.max(selectedMentionIndex.value - 1, 0);
            } else if (event.key === 'Enter' || event.key === 'Tab') {
                if (filteredParticipants.value.length > 0) {
                    event.preventDefault();
                    selectMention(filteredParticipants.value[selectedMentionIndex.value]);
                }
            } else if (event.key === 'Escape') {
                event.preventDefault();
                showMentionsDropdown.value = false;
                mentionSearchText.value = '';
                mentionStartPos.value = -1;
            }
        };

        const selectMention = (participant) => {
            if (!participant || mentionStartPos.value === -1) return;

            if (props.allowRichText && richInputRef.value) {
                const doc = getFrontDocument();
                const win = getFrontWindow();
                const selection = win.getSelection();
                if (!selection || selection.rangeCount === 0) return;

                const mentionLength = (mentionSearchText.value || '').length;
                const startOffset = Math.max(mentionStartPos.value, 0);
                const endOffset = startOffset + mentionLength + 1; // include '@'

                const startPoint = getDomPointFromOffset(startOffset);
                const endPoint = getDomPointFromOffset(endOffset);

                const range = doc.createRange();
                if (!startPoint.container || !endPoint.container) return;
                range.setStart(startPoint.container, startPoint.offset);
                range.setEnd(endPoint.container, endPoint.offset);

                const mentionSpan = doc.createElement('span');
                mentionSpan.className = 'ww-message-item__mention';
                mentionSpan.textContent = `@${participant.name}`;
                const trailingSpace = doc.createTextNode(' ');

                range.deleteContents();
                range.insertNode(trailingSpace);
                range.insertNode(mentionSpan);

                mentions.value = addMention(participant, mentions.value);

                showMentionsDropdown.value = false;
                mentionSearchText.value = '';
                mentionStartPos.value = -1;

                const newRange = doc.createRange();
                newRange.setStartAfter(trailingSpace);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);

                handleRichInput();
                return;
            }

            const textarea = textareaRef.value;
            if (!textarea) return;

            const text = inputValue.value || '';
            const before = text.substring(0, mentionStartPos.value);
            const after = text.substring(textarea.selectionStart);
            const mentionText = `@${participant.name}`;
            inputValue.value = before + mentionText + ' ' + after;
            plainTextValue.value = inputValue.value.replace(/[*_~`]/g, '');

            mentions.value = addMention(participant, mentions.value);

            showMentionsDropdown.value = false;
            mentionSearchText.value = '';
            mentionStartPos.value = -1;

            nextTick(() => {
                const newCursorPos = before.length + mentionText.length + 1;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                updateSelection();
                adjustTextareaHeight();
                textarea.focus();
            });
        };

        const addMention = (participant, mentionArray) => {
            const exists = mentionArray.some(m => m.id === participant.id);
            if (exists) {
                return mentionArray;
            }
            return [
                ...mentionArray,
                {
                    id: participant.id,
                    name: participant.name,
                    avatar: participant.avatar || '',
                },
            ];
        };

        const handleAttachment = event => {
            if (isEditing.value || props.isDisabled) return;

            const files = event.target.files;
            if (files && files.length > 0) {
                emit('attachment', files);
                event.target.value = '';
            }
        };

        const removeAttachment = index => {
            if (isEditing.value || props.isDisabled) return;
            emit('remove-attachment', index);
        };

        const onPendingAttachmentClick = (attachment, index) => {
            if (props.isDisabled) return;
            emit('pending-attachment-click', { attachment, index });
        };

        const handleCancelEdit = () => {
            if (isEditing.value || props.isDisabled) return;
            emit('cancel-edit');
        };

        const isImageFile = attachment => {
            if (!attachment.type) return false;
            return attachment.type.startsWith('image/');
        };

        const formatFileSize = bytes => {
            if (!bytes || bytes === 0) return '0 Bytes';

            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
        };

        const getDomPointFromOffset = (offset) => {
            if (!richInputRef.value) {
                return { container: null, offset: 0 };
            }
            let remaining = Math.max(0, offset);
            const doc = getFrontDocument();
            const walker = doc.createTreeWalker(richInputRef.value, NodeFilter.SHOW_TEXT, null);
            let node = walker.nextNode();
            while (node) {
                const length = node.nodeValue?.length ?? 0;
                if (remaining <= length) {
                    return { container: node, offset: remaining };
                }
                remaining -= length;
                node = walker.nextNode();
            }
            return { container: richInputRef.value, offset: richInputRef.value.childNodes?.length || 0 };
        };

        const richPreviewHtml = computed(() => {
            if (!props.allowRichText) return '';
            return formatRichText(
                inputValue.value,
                mentions.value,
                false, // isRichText
                props.mentionsColor,
                props.mentionsBgColor
            );
        });

        return {
            textareaRef,
            richInputRef,
            inputValue,
            canSend,
            isUiDisabled,
            sendIconHtml,
            attachmentIconHtml,
            removeIconHtml,
            alignItemsCss,
            sendButtonStyle,
            attachmentButtonStyle,
            richSizingStyle,
            inputAreaStyles: computed(() => ({
                borderTop: props.inputAreaBorder,
            })),
            inputStyles: computed(() => ({
                backgroundColor: props.inputBgColor,
                color: props.inputTextColor,
                '--placeholder-color': props.inputPlaceholderColor,
                borderRadius: props.inputBorderRadius,
                '--textarea-border': props.textareaBorder,
                '--textarea-border-hover': props.textareaBorderHover,
                '--textarea-border-focus': props.textareaBorderFocus,
            })),
            iconBtnStyles: computed(() => ({
                color: props.inputTextColor,
                opacity: props.isDisabled ? 0.5 : 1,
            })),
            allowRichText: computed(() => props.allowRichText),
            isImageFile,
            formatFileSize,

            onEnterKey,
            sendMessage,
            handleAttachment,
            removeAttachment,
            onPendingAttachmentClick,

            // Mentions
            showMentionsDropdown,
            filteredParticipants,
            selectedMentionIndex,
            mentionsDropdownStyle,
            getInitials,
            handleRawInput,
            handleKeyDown,
            selectMention,
            handleCancelEdit,
            applyFormat,
            updateSelection,
            updateRichSelection,
            handleRichInput,
            handleRichKeyDown,
            richPreviewHtml,
        };
    },
};
</script>

<style lang="scss" scoped>
.ww-chat-input-area {
    display: flex;
    flex-direction: column;
    padding: 16px 20px;
    gap: 12px;
    border-top: v-bind('inputAreaBorder');
    width: 100%;
    flex-shrink: 0;
    background-color: v-bind('inputBgColor');
    position: relative;
    box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.06);

    &__input-row {
        display: flex;
        align-items: flex-end;
        gap: 12px;
        width: 100%;
    }

    &__attachments {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 4px;
        max-height: 120px;
        /* Hide scrollbar by default; show when focused for multiline */
        overflow-y: auto;
        padding: 6px;
        border-radius: 12px;
        background-color: rgba(0, 0, 0, 0.02);
        position: relative;
        z-index: 2;
    }

    &__attachment {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 12px;
        background-color: #f8fafc;
        padding: 8px 10px;
        max-width: 220px;
        flex-shrink: 0;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
        }
    }

    &__attachment-file {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
    }

    &__attachment-info {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        flex: 1;
    }

    &__attachment-name {
        font-size: 0.8125rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.3;
        color: #334155;
    }

    &__attachment-size {
        font-size: 0.75rem;
        opacity: 0.65;
        line-height: 1.2;
        color: #64748b;
        font-weight: 500;
    }

    &__attachment-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        border-radius: 4px;
        background-color: #f1f5f9;
    }

    &__attachment-remove {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        background: linear-gradient(135deg, #f87171, #ef4444);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        color: white;

        &:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.15);
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        &:active {
            transform: scale(0.95);
        }
    }

    &__attachment-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
        align-self: auto;

        &:hover {
            background: var(--btn-hover-bg, #f1f5f9);
            transform: translateY(-1px);
            box-shadow: var(--btn-hover-shadow, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        &--disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
            box-shadow: none;
            transform: none;
        }

        &:active {
            transform: translateY(0);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
    }

    &__attachment-input {
        position: absolute;
        width: 0;
        height: 0;
        opacity: 0;
        pointer-events: none;
    }

    &__icon {
        display: flex;
        align-items: center;
        justify-content: center;

        :deep(svg) {
            width: 100%;
            height: 100%;
        }
    }

    &__input-container {
        position: relative;
        flex: 1;
        align-self: flex-end;
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }

    &__toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        padding: 4px 6px;
        border-radius: 8px;
        background: rgba(148, 163, 184, 0.12);
        align-self: stretch;
    }

    &__toolbar-btn {
        border: none;
        background: transparent;
        color: #334155;
        font-size: 0.875rem;
        padding: 4px 6px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 30px;
        transition: background 0.2s ease, transform 0.1s ease;

        &:hover:not(:disabled) {
            background: rgba(148, 163, 184, 0.2);
        }

        &:active:not(:disabled) {
            transform: scale(0.95);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &__toolbar-code {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.75rem;
    }

    &__toolbar-strike {
        text-decoration: line-through;
        font-weight: 600;
    }

    &__rich-input {
        border-radius: v-bind('inputBorderRadius');
        font-size: v-bind('inputFontSize');
        font-weight: v-bind('inputFontWeight');
        font-family: v-bind('inputFontFamily');
        line-height: 1.5;
        padding: 8px 16px;
        border: v-bind('textareaBorder');
        background-color: v-bind('inputBgColor');
        color: v-bind('inputTextColor');
        overflow-y: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        outline: none;
        white-space: pre-wrap;
        max-height: calc(var(--rich-input-max-height, 260px));

        &:not(.ww-chat-input-area__rich-input--disabled) {
            min-height: calc(var(--rich-input-min-height, 38px));
        }

        &:hover {
            border: v-bind('textareaBorderHover');
        }

        &:focus {
            border: v-bind('textareaBorderFocus');
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
        }

        &::selection {
            background: rgba(59, 130, 246, 0.25);
        }

        &:empty::before {
            content: attr(data-placeholder);
            color: v-bind('inputPlaceholderColor');
            font-weight: 400;
            pointer-events: none;
        }

        &--disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: #f8fafc;
            overflow-y: hidden;
        }

        :deep(strong) {
            font-weight: 600;
        }

        :deep(em) {
            font-style: italic;
        }

        :deep(code) {
            background-color: rgba(0, 0, 0, 0.08);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.85em;
        }

        :deep(s),
        :deep(strike) {
            text-decoration: line-through;
        }

        :deep(a) {
            color: v-bind('inputTextColor');
            text-decoration: underline;
        }

        :deep(ul) {
            padding-left: 1.2rem;
            margin: 0.35rem 0;
        }

        :deep(li) {
            margin: 0.2rem 0;
        }

        :deep(.ww-rt-break) {
            display: block;
            margin: 0;
            line-height: 1.5;
        }

        :deep(p) {
            margin: 0;
        }
    }

    &__input {
        width: 100%;
        resize: none;
        padding: 8px 16px;
        border-radius: v-bind('inputBorderRadius');
        font-size: v-bind('inputFontSize');
        font-weight: v-bind('inputFontWeight');
        font-family: v-bind('inputFontFamily');
        line-height: 1.5;
        overflow-y: hidden;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        background-color: v-bind('inputBgColor');
        color: v-bind('inputTextColor');
        border: var(--textarea-border);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        vertical-align: bottom;
        align-self: flex-end;
        margin: 0;
        min-height: calc(var(--rich-input-min-height, 38px));
        max-height: calc(var(--rich-input-max-height, 260px));

        &::-webkit-scrollbar {
            width: 0;
            height: 0;
        }

        &::placeholder {
            color: v-bind('inputPlaceholderColor');
            font-weight: 400;
        }

        &:hover {
            border: var(--textarea-border-hover);
            overflow-y: auto;
        }

        &:focus {
            outline: none;
            border: var(--textarea-border-focus);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
            overflow-y: auto;
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: #f8fafc;
            overflow-y: hidden;
        }
    }

    &__send-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
        align-self: auto;

        &:hover:not(:disabled) {
            background: var(--btn-hover-bg, linear-gradient(135deg, #2563eb, #1d4ed8));
            transform: translateY(-1px);
            box-shadow: var(--btn-hover-shadow, 0 4px 8px rgba(59, 130, 246, 0.4));
        }

        &:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.4;
            background: #94a3b8;
            box-shadow: none;
            transform: none;
        }

        &--disabled {
            background: #e2e8f0;
            color: #94a3b8;
            box-shadow: none;
        }
    }

    &__cancel-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        color: #64748b;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
        flex-shrink: 0;
        margin-right: 8px;

        &:hover:not(:disabled) {
            background: #f1f5f9;
            border-color: #cbd5e1;
            color: #334155;
        }

        &:active:not(:disabled) {
            background: #e2e8f0;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &__mentions-dropdown {
        position: absolute;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-height: 240px;
        overflow-y: auto;
        z-index: 1000;
        padding: 4px;
    }

    &__mention-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.15s ease;

        &:hover,
        &--selected {
            background-color: #f1f5f9;
        }

        &:active {
            background-color: #e2e8f0;
        }
    }

    &__mention-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    &__mention-avatar-initials {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        flex-shrink: 0;
    }

    &__mention-info {
        flex: 1;
        min-width: 0;
    }

    &__mention-name {
        font-size: 14px;
        font-weight: 600;
        color: #334155;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    &__mention-location {
        font-size: 12px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 2px;
    }

    &__mention-empty {
        padding: 16px;
        text-align: center;
        color: #94a3b8;
        font-size: 14px;
        font-style: italic;
    }
}
</style>
