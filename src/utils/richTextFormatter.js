/**
 * Formats text with rich text support (markdown-like) while preserving mentions
 * Supports: **bold**, *italic*, `code`, [links](url), ~~strikethrough~~
 */

/**
 * Escape HTML special characters
 */
const escapeHtml = (text) => {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Process rich text formatting in a text segment
 */
const processRichText = (text, allowRichText = true) => {
    if (!text || !allowRichText) {
        return escapeHtml(text);
    }

    let result = escapeHtml(text);

    // Store placeholders for protected content to prevent nested processing
    const codeBlocks = [];
    const strikeBlocks = [];
    let codeIndex = 0;
    let strikeIndex = 0;

    // Protect inline code first (has highest priority, prevents other formatting)
    result = result.replace(/`([^`\n]+?)`/g, (match, code) => {
        const placeholder = `@@WW_CODE_${codeIndex}@@`;
        codeBlocks.push(`<code>${code}</code>`);
        codeIndex++;
        return placeholder;
    });

    // Protect strikethrough
    result = result.replace(/~~([\s\S]+?)~~/g, (match, content) => {
        const placeholder = `@@WW_STRIKE_${strikeIndex}@@`;
        strikeBlocks.push(`<s>${content}</s>`);
        strikeIndex++;
        return placeholder;
    });

    // Process bold: **text** or __text__ (must have at least one character, not newlines)
    // Process bold before italic to avoid conflicts
    result = result.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([\s\S]+?)__/g, '<strong>$1</strong>');

    // Process italic: *text* or _text_ (single markers)
    // Since bold (**text** and __text__) is already processed and replaced,
    // any remaining single * or _ markers should be italic
    // Allow content to span multiple lines
    result = result.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
    
    // Match single underscore for italic
    // Use word boundary to avoid matching in the middle of words like "test_text"
    // But also allow matching when not at word boundaries for cases like "text_text"
    result = result.replace(/([^_a-zA-Z0-9]|^)_([\s\S]+?)_([^_a-zA-Z0-9]|$)/g, '$1<em>$2</em>$3');

    // Process links: [text](url)
    result = result.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Restore protected content (code blocks first, then strikethrough)
    codeBlocks.forEach((content, index) => {
        result = result.replace(`@@WW_CODE_${index}@@`, content);
    });
    strikeBlocks.forEach((content, index) => {
        result = result.replace(`@@WW_STRIKE_${index}@@`, content);
    });

    // Convert simple markdown bullet lists (- item) into HTML lists
    // But preserve all spacing, especially around formatted text and between paragraphs
    const lines = result.split('\n');
    const segments = [];
    let listBuffer = [];
    let previousWasEmpty = false;

    const flushList = () => {
        if (listBuffer.length === 0) return;
        segments.push(`<ul>${listBuffer.join('')}</ul>`);
        listBuffer = [];
    };

    lines.forEach((line, index) => {
        const match = line.match(/^\s*-\s+(.*)/);
        if (match) {
            listBuffer.push(`<li>${match[1]}</li>`);
            previousWasEmpty = false;
        } else {
            flushList();
            const isLineEmpty = !line || line.trim().length === 0;
            
            if (isLineEmpty) {
                // Convert every empty line to <br /> tag to preserve paragraph spacing
                // This ensures that blank lines between paragraphs are visible in the rendered HTML
                // Multiple consecutive empty lines will create multiple <br /> tags for extra spacing
                segments.push('<br />');
                previousWasEmpty = true;
            } else {
                // Don't trim lines - preserve all spacing, especially around formatted text
                // This ensures spaces between **bold** and regular text are preserved
                
                // If line starts with an HTML tag, preserve it as-is (but don't trim)
                if (/^<\s*(ul|ol|li|div|p|table|blockquote|pre)/i.test(line.trim())) {
                    segments.push(line.trim());
                } else {
                    // Preserve the line as-is to maintain spacing around formatted text
                    // This ensures spaces between **bold** and regular text are preserved
                    segments.push(line);
                }
                previousWasEmpty = false;
            }
        }
    });

    flushList();

    // Join segments without newlines to ensure <br /> tags render correctly
    // HTML will collapse whitespace anyway, so we want <br /> tags directly adjacent to content
    result = segments.join('');
    
    // Add proper spacing after lists
    result = result.replace(
        /<\/ul>(?:\s*){2,}/g,
        '</ul><div class="ww-rt-break"><br /></div>'
    );

    return result;
};

/**
 * Find all mention occurrences in text
 */
const findMentions = (text, mentions = []) => {
    const mentionOccurrences = [];

    if (mentions && mentions.length > 0) {
        // Use provided mentions data for precise matching
        mentions.forEach(mention => {
            const mentionPattern = `@${mention.name}`;
            let index = text.indexOf(mentionPattern);
            
            while (index !== -1) {
                const endIndex = index + mentionPattern.length;
                const charAfter = text.charAt(endIndex);
                
                // Check if mention is properly delimited (followed by whitespace, punctuation, or end of string)
                // Also ensure it's not part of a larger word (check character before @)
                const charBefore = index > 0 ? text.charAt(index - 1) : '';
                const isWordBoundaryBefore = !charBefore || /\s/.test(charBefore);
                const isWordBoundaryAfter = !charAfter || /\s/.test(charAfter) || /[,.:;!?)\n]/.test(charAfter);
                
                if (isWordBoundaryBefore && isWordBoundaryAfter) {
                    mentionOccurrences.push({
                        start: index,
                        end: endIndex,
                        text: mentionPattern,
                        mention: mention
                    });
                }
                
                index = text.indexOf(mentionPattern, index + 1);
            }
        });
    } else {
        // Fallback: use regex for generic @mention detection
        const mentionRegex = /@([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)?)(?=\s+[a-z]|\s*[,.:;!?)\n]|$)/g;
        let match;
        
        while ((match = mentionRegex.exec(text)) !== null) {
            mentionOccurrences.push({
                start: match.index,
                end: match.index + match[0].length,
                text: match[0],
                mention: { name: match[1] }
            });
        }
    }

    // Sort by position (earliest first)
    mentionOccurrences.sort((a, b) => a.start - b.start);

    return mentionOccurrences;
};

/**
 * Format text with rich text support while preserving mentions
 * @param {string} text - The text to format
 * @param {Array} mentions - Array of mention objects with name property
 * @param {boolean} allowRichText - Whether to enable rich text formatting
 * @param {string} mentionsColor - Color for mentions
 * @param {string} mentionsBgColor - Background color for mentions
 * @returns {string} Formatted HTML string
 */
export const formatRichText = (text, mentions = [], allowRichText = true, mentionsColor = '#3b82f6', mentionsBgColor = '#dbeafe') => {
    if (!text) return '';

    // Find all mentions first
    const mentionOccurrences = findMentions(text, mentions);

    if (mentionOccurrences.length === 0) {
        // No mentions, just process rich text
        return processRichText(text, allowRichText);
    }

    // Build the result by processing text segments around mentions
    const parts = [];
    let lastIndex = 0;

    mentionOccurrences.forEach(occurrence => {
        // Process text before this mention with rich text formatting
        if (occurrence.start > lastIndex) {
            const beforeText = text.substring(lastIndex, occurrence.start);
            parts.push(processRichText(beforeText, allowRichText));
        }

        // Add the highlighted mention (don't process rich text in mentions)
        const escapedMention = escapeHtml(occurrence.text);
        parts.push(`<span class="ww-message-item__mention" style="background-color: ${mentionsBgColor}; color: ${mentionsColor};">${escapedMention}</span>`);

        // Check if there's a space immediately after the mention and preserve it
        const charAfterMention = text.charAt(occurrence.end);
        if (charAfterMention === ' ') {
            // Include the space after the mention span to ensure it's preserved
            parts.push(' ');
            lastIndex = occurrence.end + 1;
        } else {
            lastIndex = occurrence.end;
        }
    });

    // Process remaining text after last mention
    if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        parts.push(processRichText(remainingText, allowRichText));
    }

    return parts.join('');
};
