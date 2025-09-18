import html from 'licia/html';
import { contain, map, trim } from 'licia';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

function processClass(str: string) {
    const prefix = 'eruda-';

    return map(trim(str).split(/\s+/), (singleClass) => {
        if (contain(singleClass, prefix)) {
            return singleClass;
        }

        return singleClass.replace(/[\w-]+/, (match) => `${prefix}${match}`);
    }).join(' ');
}

function traverseTree(tree: Node[], handler: (node: Node) => void) {
    for (let i = 0, len = tree.length; i < len; i++) {
        const node = tree[i];
        handler(node);
        if (node.content) {
            traverseTree(node.content, handler);
        }
    }
}

export function classPrefix(str: string): string {
    if (/<[^>]*>/g.test(str)) {
        try {
            const tree = html.parse(str);
            traverseTree(tree, (node) => {
                if (node.attrs && node.attrs.class) {
                    node.attrs.class = processClass(node.attrs.class);
                }
            });
            return html.stringify(tree);
        } catch {
            return processClass(str);
        }
    }

    return processClass(str);
}
