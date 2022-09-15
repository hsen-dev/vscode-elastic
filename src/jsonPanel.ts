import * as vscode from 'vscode';

function renderJson(jsonObj: object): string {
    var str = JSON.stringify(jsonObj, undefined, 4);
    return syntaxHighlight(str);
}

function syntaxHighlight(json: string): string {
    json = json.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}
export class JsonPanel {
    static JsonCss: string = `
    /* dark */
    .vscode-dark .string {
        color: #66BB6A
    }

    .vscode-dark .number {
        color: orange
    }

    .vscode-dark .boolean {
        color: #008099
    }

    .vscode-dark .null {
        color: #ef50c5
    }

    .vscode-dark .key {
        color: #ef5350
    }


    /* light */
    .vscode-light .string {
        color: green
    }

    .vscode-light .number {
        color: darkorange
    }

    .vscode-light .boolean {
        color: blue
    }

    .vscode-light .null {
        color: magenta
    }

    .vscode-light .key {
        color: red
    }`;

    private Panel: vscode.WebviewPanel | null = null;

    public constructor() {}

    public render(jsonObj: object, title?: string) {
        this.ensurePanelValid(title || 'ElasticSearch Results');
        var jsonHtml = renderJson(jsonObj);
        (this.Panel as vscode.WebviewPanel).webview.html = `<style>${JsonPanel.JsonCss}</style><pre>${jsonHtml}</pre>`;
    }

    public ensurePanelValid(title: string): void {
        if (this.Panel == null) {
            this.Panel = vscode.window.createWebviewPanel('Test', title, vscode.ViewColumn.Two, {});
            this.Panel.onDidDispose(() => {
                this.Panel = null;
            });
        } else {
            this.Panel.title = title;
        }
    }
}
