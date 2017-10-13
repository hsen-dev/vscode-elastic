import * as vscode from 'vscode';
import { ElasticMatch } from './ElasticMatch'
import { UpdateDecoration } from './ElasticDecoration'

export class ElasticCodeLensProvider implements vscode.CodeLensProvider {
    context: vscode.ExtensionContext;

    public constructor(context: vscode.ExtensionContext) {
        this.context = context
    }

    public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken) {

        const editor = vscode.window.activeTextEditor;
        var eMatches = UpdateDecoration(editor)

        // "⚡ ↯ ▷↓↑ Lint"

        var ret = [];

        eMatches.forEach(em => {

            ret.push(new vscode.CodeLens(em.Method.Range, {
                title: "▶ Run Query",
                command: "elastic.execute",
                arguments: [em]
            }))

            if (em.HasBody && em.Error.Range == null) {
                ret.push(new vscode.CodeLens(em.Method.Range, {
                    title: "⚡ Auto indent",
                    command: "elastic.lint",
                    arguments: [em]
                }))
            }
            else {
                if (em.Error.Range != null) {
                    ret.push(new vscode.CodeLens(em.Method.Range, {
                        title: "⚠️ Invalid Json",
                        command: ""
                    }))
                }
            }
        });
        return ret;
    }
}