import DOMPurify from "dompurify";

export default function sanitizeHtmlAndPreserveLinks(htmlContent: string) {
    // Allow only <a> tags
    const cleanHtml = DOMPurify.sanitize(htmlContent, {
        ALLOWED_TAGS: ['a'], // Allow only <a> tags
        ALLOWED_ATTR: ['href'], // Allow only href attribute in <a> tags
    });

    return cleanHtml;
}