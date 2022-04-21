import * as vscode from 'vscode';
import * as path from 'path';
import fs = require('fs');
const Mustache = require('mustache');

export class ElasticContentProvider implements vscode.TextDocumentContentProvider {
    host!: string;
    time!: number;
    context!: vscode.ExtensionContext;
    statusCode!: number;
    statusText!: string;
    results!: string;

    searchQuery!: string;

    public contentUri = vscode.Uri.parse('elasticsearch://results');
    private changeEvent = new vscode.EventEmitter<vscode.Uri>();

    public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): string | Thenable<string> {
        let json = '';
        let plain = '';

        const config = vscode.workspace.getConfiguration();

        if (typeof this.results === 'string' && this.results.startsWith('{')) {
            json = this.results;
        } else if (typeof this.results === 'string' && this.results.indexOf('\n')) {
            plain = this.results.replace(/\n/g, '<br/>').replace(/\r/g, '<br/>');
        } else if (typeof this.results === 'object') {
            json = JSON.stringify(this.results);
        } else {
            plain = this.results;
        }

        let mediaPath = this.getPath('media');

        let header = `<script src="${mediaPath}/json-formatter.js"></script>
                  <script src="${mediaPath}/jquery.min.js"></script>
                  <script src="${mediaPath}/jquery.contextMenu.js"></script>
                  <link rel="stylesheet" type="text/css" href="${mediaPath}/results.css">
                  <link rel="stylesheet" type="text/css" href="${mediaPath}/jquery.contextMenu.css">`;

        let err = '';
        if (this.statusCode != 200) {
            err = 'err';
        }
        if (this.statusCode == 0) {
            err = 'wait';
        }

        var data = fs.readFileSync(this.getPath('media/result.tmpl'), 'utf-8');
        var result = Mustache.render(data, {
            fontSize: config.get('editor.fontSize'),
            fontFamily: config.get('editor.fontFamily'),
            header: header,
            err: err,
            statusCode: this.statusCode,
            statusText: this.statusText,
            plain: plain,
            json: json,
            host: this.host,
            time: this.time,
        });

        return result;
    }

    update(context: any, host: any, results: any, time_el: any, statusCode: any, statusText: any) {
        this.results = results;
        this.host = host;
        this.time = time_el;
        this.context = context;
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.changeEvent.fire(this.contentUri);
    }
    getPath(p: any) {
        return path.join(this.context.extensionPath, p);
    }

    get onDidChange() {
        return this.changeEvent.event;
    }
}
