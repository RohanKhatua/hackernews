import sanitizeHtmlAndPreserveLinks from "./sanitize-html";

export default function convertTagstoTextExceptLinks(htmlContent: string, maxLinkLength: number = 50) {
    const container = document.createElement('div');
    container.innerHTML = sanitizeHtmlAndPreserveLinks(htmlContent);

    const nodes = Array.from(container.childNodes);

    nodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() !== 'a' && node.textContent) {
            const textNode = document.createTextNode(node.textContent);
            container.replaceChild(textNode, node);
        }
    });

    const linkNodes = container.querySelectorAll('a');
    for (const linkNode of linkNodes) {
        const longUrl = linkNode.getAttribute('href');
        if (longUrl) {
            linkNode.setAttribute('href', longUrl);
            linkNode.textContent = "[link]";
        }
    }

    return container.innerHTML;
}