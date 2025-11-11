<template>
    <div
        class="ww-message-item"
        :class="{
            'ww-message-item--own': isOwnMessage,
            'ww-message-item--continued': sameSenderAsPrevious,
            'ww-message-item--continue-next': sameSenderAsNext,
        }"
    >
        <!-- Message content -->
        <div
            class="ww-message-item__content"
            :class="{ 'ww-message-item__content--own': isOwnMessage }"
            :style="messageStyles"
            @contextmenu.prevent="handleRightClick"
            @mouseenter="showMenu = isOwnMessage"
            @mouseleave="showMenu = false"
        >
            <!-- Menu button for own messages -->
            <div
                v-if="isOwnMessage"
                class="ww-message-item__menu"
                :class="{ 'ww-message-item__menu--visible': showMenu }"
            >
                <button
                    class="ww-message-item__menu-button"
                    @click.stop="toggleMenu"
                    :style="{ color: menuIconColor }"
                >
                    <span
                        class="ww-message-item__menu-icon"
                        :style="{ width: menuIconSize, height: menuIconSize }"
                        v-html="menuIconHtml"
                    ></span>
                </button>
                <div
                    v-if="showMenuDropdown"
                    class="ww-message-item__menu-dropdown"
                    @click.stop
                >
                    <button
                        class="ww-message-item__menu-item"
                        @click="handleEdit"
                    >
                        <span
                            class="ww-message-item__menu-item-icon"
                            :style="{ width: editIconSize, height: editIconSize, color: editIconColor }"
                            v-html="editIconHtml"
                        ></span>
                        <span>Edit</span>
                    </button>
                    <button
                        class="ww-message-item__menu-item ww-message-item__menu-item--delete"
                        @click="handleDelete"
                    >
                        <span
                            class="ww-message-item__menu-item-icon"
                            :style="{ width: deleteIconSize, height: deleteIconSize, color: deleteIconColor }"
                            v-html="deleteIconHtml"
                        ></span>
                        <span>Delete</span>
                    </button>
                </div>
            </div>

            <!-- Sender name if first in group -->
            <div
                v-if="!sameSenderAsPrevious"
                class="ww-message-item__sender"
                :class="{ 'ww-message-item__sender--own': isOwnMessage }"
            >
                {{ message.userName }}
            </div>

            <!-- Message text -->
            <div class="ww-message-item__text" v-html="highlightedMessageText"></div>

            <!-- Attachments if any -->
            <div v-if="formattedAttachments.length" class="ww-message-item__attachments">
                <div
                    v-for="(attachmentMeta, index) in formattedAttachments"
                    :key="attachmentMeta.attachment.id ?? index"
                    class="ww-message-item__attachment"
                    :class="{ 'ww-message-item__attachment--own': isOwnMessage }"
                    @click="handleAttachmentClick(attachmentMeta.attachment)"
                >
                    <!-- Image preview for image files -->
                    <div
                        v-if="attachmentMeta.isImage"
                        class="ww-message-item__attachment-preview"
                        :class="{ 'ww-message-item__attachment-preview--own': isOwnMessage }"
                    >
                        <img :src="attachmentMeta.attachment.url" :alt="attachmentMeta.attachment.name" />
                    </div>

                    <!-- File icon for non-image files -->
                    <div
                        v-else
                        class="ww-message-item__attachment-file"
                        :class="{ 'ww-message-item__attachment-file--own': isOwnMessage }"
                    >
                        <div class="ww-message-item__attachment-icon">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
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
                        <div class="ww-message-item__attachment-info">
                            <div class="ww-message-item__attachment-name">{{ attachmentMeta.attachment.name }}</div>
                            <div v-if="attachmentMeta.formattedSize" class="ww-message-item__attachment-size">
                                {{ attachmentMeta.formattedSize }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Message timestamp -->
            <div class="ww-message-item__time">
                {{ formatMessageTime(message.timestamp) }}
            </div>
        </div>
    </div>
</template>

<script>
import { computed, inject, ref, watchEffect, onMounted, onUnmounted } from 'vue';
import { formatTime } from '../utils/dateTimeFormatter';
import { formatRichText } from '../utils/richTextFormatter';

export default {
    name: 'MessageItem',
    props: {
        message: {
            type: Object,
            required: true,
        },
        isOwnMessage: {
            type: Boolean,
            default: false,
        },
        sameSenderAsPrevious: {
            type: Boolean,
            default: false,
        },
        sameSenderAsNext: {
            type: Boolean,
            default: false,
        },
        messageBgColor: {
            type: String,
            default: '#f1f5f9',
        },
        messageTextColor: {
            type: String,
            default: '#334155',
        },
        messageFontSize: {
            type: String,
            default: '0.875rem',
        },
        messageFontWeight: {
            type: String,
            default: '400',
        },
        messageFontFamily: {
            type: String,
            default: 'inherit',
        },
        messageBorder: {
            type: String,
            default: '1px solid #e2e8f0',
        },
        ownMessageBgColor: {
            type: String,
            default: '#dbeafe',
        },
        ownMessageTextColor: {
            type: String,
            default: '#1e40af',
        },
        ownMessageFontSize: {
            type: String,
            default: '0.875rem',
        },
        ownMessageFontWeight: {
            type: String,
            default: '400',
        },
        ownMessageFontFamily: {
            type: String,
            default: 'inherit',
        },
        ownMessageBorder: {
            type: String,
            default: '1px solid #bfdbfe',
        },
        messageRadius: {
            type: String,
            default: '18px 18px 18px 18px',
        },
        ownMessageRadius: {
            type: String,
            default: '18px 18px 18px 18px',
        },
        mentionsColor: {
            type: String,
            default: '#3b82f6',
        },
        mentionsBgColor: {
            type: String,
            default: '#dbeafe',
        },
        menuIcon: {
            type: String,
            default: 'more-vertical',
        },
        menuIconColor: {
            type: String,
            default: '#64748b',
        },
        menuIconSize: {
            type: String,
            default: '16px',
        },
        editIcon: {
            type: String,
            default: 'edit',
        },
        editIconColor: {
            type: String,
            default: '#334155',
        },
        editIconSize: {
            type: String,
            default: '14px',
        },
        deleteIcon: {
            type: String,
            default: 'trash',
        },
        deleteIconColor: {
            type: String,
            default: '#ef4444',
        },
        deleteIconSize: {
            type: String,
            default: '14px',
        },
        allowRichText: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['attachment-click', 'right-click', 'edit', 'delete'],
    setup(props, { emit }) {
        const isEditing = inject(
            'isEditing',
            computed(() => false)
        );
        const chatRootEl = inject('chatRootEl', null);
        const showMenu = ref(false);
        const showMenuDropdown = ref(false);
        const menuIconText = ref(null);
        const editIconText = ref(null);
        const deleteIconText = ref(null);

        const dateTimeOptions = inject(
            'dateTimeOptions',
            computed(() => ({}))
        );

        const { getIcon } = wwLib.useIcons();

        const defaultMenuIcon = `<svg
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
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
        </svg>`;

        const defaultEditIcon = `<svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>`;

        const defaultDeleteIcon = `<svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>`;

        watchEffect(async () => {
            try {
                if (props.menuIcon) {
                    menuIconText.value = await getIcon(props.menuIcon);
                }
            } catch (error) {
                menuIconText.value = null;
            }
        });

        watchEffect(async () => {
            try {
                if (props.editIcon) {
                    editIconText.value = await getIcon(props.editIcon);
                }
            } catch (error) {
                editIconText.value = null;
            }
        });

        watchEffect(async () => {
            try {
                if (props.deleteIcon) {
                    deleteIconText.value = await getIcon(props.deleteIcon);
                }
            } catch (error) {
                deleteIconText.value = null;
            }
        });

        const menuIconHtml = computed(() => {
            return menuIconText.value || defaultMenuIcon;
        });

        const editIconHtml = computed(() => {
            return editIconText.value || defaultEditIcon;
        });

        const deleteIconHtml = computed(() => {
            return deleteIconText.value || defaultDeleteIcon;
        });

        const messageStyles = computed(() => {
            if (props.isOwnMessage) {
                return {
                    backgroundColor: props.ownMessageBgColor,
                    color: props.ownMessageTextColor,
                    fontSize: props.ownMessageFontSize,
                    fontWeight: props.ownMessageFontWeight,
                    fontFamily: props.ownMessageFontFamily,
                    border: props.ownMessageBorder,
                    '--message-radius': props.ownMessageRadius,
                };
            } else {
                return {
                    backgroundColor: props.messageBgColor,
                    color: props.messageTextColor,
                    fontSize: props.messageFontSize,
                    fontWeight: props.messageFontWeight,
                    fontFamily: props.messageFontFamily,
                    border: props.messageBorder,
                    '--message-radius': props.messageRadius,
                };
            }
        });

        const isImageFile = attachment => {
            if (!attachment.type) return false;
            return attachment.type.startsWith('image/');
        };

        const formatFileSize = rawSize => {
            const bytes = Number(rawSize);
            if (!Number.isFinite(bytes) || bytes < 0) return '';
            if (bytes === 0) return '0 Bytes';

            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
            const value = bytes / Math.pow(1024, index);
            return `${parseFloat(value.toFixed(2))} ${sizes[index]}`;
        };

        const formattedAttachments = computed(() => {
            const attachments = Array.isArray(props.message.attachments) ? props.message.attachments : [];
            return attachments.map(attachment => ({
                attachment,
                isImage: isImageFile(attachment),
                formattedSize: formatFileSize(attachment.size),
            }));
        });

        const formatMessageTime = timestamp => {
            return formatTime(timestamp, dateTimeOptions.value);
        };

        const handleAttachmentClick = attachment => {
            if (isEditing.value) return;
            emit('attachment-click', attachment);
        };

        const handleRightClick = event => {
            // Coordinates relative to the chat root element
            let elementX = 0;
            let elementY = 0;
            const root = chatRootEl && chatRootEl.value ? chatRootEl.value : null;
            if (root && typeof root.getBoundingClientRect === 'function') {
                const chatRect = root.getBoundingClientRect();
                elementX = event.clientX - chatRect.left;
                elementY = event.clientY - chatRect.top;
            } else {
                // Fallback: treat client coords as element-relative if root not found
                elementX = event.clientX;
                elementY = event.clientY;
            }

            // Coordinates relative to page top-left
            const viewportX = event.pageX;
            const viewportY = event.pageY;

            emit('right-click', {
                message: props.message,
                elementX,
                elementY,
                viewportX,
                viewportY,
            });
        };

        const toggleMenu = () => {
            showMenuDropdown.value = !showMenuDropdown.value;
        };

        const handleEdit = () => {
            if (isEditing.value) return;
            showMenuDropdown.value = false;
            showMenu.value = false;
            emit('edit', props.message);
        };

        const handleDelete = () => {
            if (isEditing.value) return;
            showMenuDropdown.value = false;
            showMenu.value = false;
            emit('delete', props.message);
        };

        // Close menu when clicking outside
        const handleClickOutside = (event) => {
            if (showMenuDropdown.value && !event.target.closest('.ww-message-item__menu')) {
                showMenuDropdown.value = false;
            }
        };

        onMounted(() => {
            if (typeof document !== 'undefined') {
                document.addEventListener('click', handleClickOutside);
            }
        });

        onUnmounted(() => {
            if (typeof document !== 'undefined') {
                document.removeEventListener('click', handleClickOutside);
            }
        });

        const highlightedMessageText = computed(() => {
            const text = props.message?.text || '';
            if (!text) return '';
            
            // Get mentions from message data if available
            const mentions = props.message?.mentions || [];
            
            // Use the rich text formatter which handles both formatting and mentions
            return formatRichText(
                text,
                mentions,
                props.allowRichText,
                props.mentionsColor,
                props.mentionsBgColor
            );
        });

        return {
            messageStyles,
            isImageFile,
            formatFileSize,
            formattedAttachments,
            formatMessageTime,
            handleAttachmentClick,
            handleRightClick,
            highlightedMessageText,
            showMenu,
            showMenuDropdown,
            menuIconHtml,
            editIconHtml,
            deleteIconHtml,
            toggleMenu,
            handleEdit,
            handleDelete,
        };
    },
};
</script>

<style lang="scss" scoped>
.ww-message-item {
    display: flex;
    margin-bottom: 4px;

    &--own {
        justify-content: flex-end;
    }

    &__content {
        max-width: 70%;
        padding: 10px 12px;
        border-radius: var(--message-radius, 18px 18px 18px 18px);
        position: relative;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

        &:not(.ww-message-item--continued) {
            margin-top: 8px;
        }

        .ww-message-item--continued & {
            margin-top: 2px;
        }

        .ww-message-item--continue-next & {
            margin-bottom: 2px;
        }
    }

    &__sender {
        font-weight: 600;
        font-size: 0.75rem;
        margin-bottom: 2px;
        opacity: 0.8;

        &--own {
            text-align: right;
        }
    }

    &__text {
        line-height: 1.4;
        word-break: break-word;

        :deep(.ww-message-item__mention) {
            border-radius: 4px;
            padding: 2px 4px;
            font-weight: 600;
            display: inline;
        }

        // Rich text styling
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
            font-size: 0.9em;
            line-height: 1.4;
            display: inline-block;
        }

        .ww-message-item--own :deep(code) {
            background-color: rgba(255, 255, 255, 0.2);
        }

        :deep(s) {
            text-decoration: line-through;
            opacity: 0.7;
        }

        :deep(a) {
            color: inherit;
            text-decoration: underline;
            opacity: 0.8;

            &:hover {
                opacity: 1;
            }
        }
    }

    &__time {
        font-size: 0.6875rem;
        opacity: 0.7;
        text-align: right;
        margin-top: 4px;
        user-select: none;
    }

    &__attachments {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;

        .ww-message-item--own & {
            align-items: flex-end;
        }
    }

    &__attachment {
        border-radius: 8px;
        overflow: hidden;
        background-color: rgba(255, 255, 255, 0.1);
        cursor: pointer;

        &--own {
            align-self: flex-end;
        }
    }

    &__attachment-preview {
        max-width: var(--ww-chat-attachment-thumb-max-width, 250px);
        max-height: var(--ww-chat-attachment-thumb-max-height, 200px);
        display: flex;
        align-items: center;
        justify-content: center;

        &--own {
            justify-content: flex-end;
        }

        img {
            max-width: 100%;
            max-height: var(--ww-chat-attachment-thumb-max-height, 200px);
            object-fit: contain;
            border-radius: var(--ww-chat-attachment-thumb-radius, 6px);
        }
    }

    &__attachment-file {
        display: flex;
        align-items: center;
        padding: 8px;
        background-color: rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        max-width: 200px;

        &:hover {
            opacity: 0.9;
        }

        &--own {
            flex-direction: row-reverse;

            .ww-message-item__attachment-icon {
                margin-right: 0;
                margin-left: 8px;
            }

            .ww-message-item__attachment-info {
                text-align: right;
            }
        }
    }

    &__attachment-icon {
        margin-right: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    &__attachment-info {
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    &__attachment-name {
        font-size: 0.8125rem;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
    }

    &__attachment-size {
        font-size: 0.75rem;
        opacity: 0.7;
    }

    &__menu {
        position: absolute;
        top: 10px; /* add a bit more breathing room from the top edge */
        right: 10px; /* add a bit more breathing room from the right edge */
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10;

        &--visible {
            opacity: 1;
        }
    }

    &__menu-button {
        background: rgba(0, 0, 0, 0.05);
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 0;

        &:hover {
            background: rgba(0, 0, 0, 0.1);
            transform: scale(1.1);
        }

        &:active {
            transform: scale(0.95);
        }
    }

    &__menu-icon {
        display: flex;
        align-items: center;
        justify-content: center;

        :deep(svg) {
            width: 100%;
            height: 100%;
        }
    }

    &__menu-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 4px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 120px;
        overflow: hidden;
        z-index: 1000;
    }

    &__menu-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 0.875rem;
        color: #334155;
        transition: background-color 0.15s ease;
        text-align: left;

        &:hover {
            background-color: #f1f5f9;
        }

        &--delete {
            color: #ef4444;

            &:hover {
                background-color: #fee2e2;
            }
        }
    }

    &__menu-item-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        :deep(svg) {
            width: 100%;
            height: 100%;
        }
    }

    &__content {
        position: relative;
        /* reserve space on the right so the icon never overlaps the text */
        padding-right: 40px;

        &:hover .ww-message-item__menu {
            opacity: 1;
        }
    }
}
</style>
