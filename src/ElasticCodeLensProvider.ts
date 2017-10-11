import * as vscode from 'vscode';
import { ElasticMatch } from './ElasticMatch'

export class ElasticCodeLensProvider implements vscode.CodeLensProvider {
    context: vscode.ExtensionContext;

    public constructor(context: vscode.ExtensionContext) {
        this.context = context
    }

    public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken) {

        const editor = vscode.window.activeTextEditor;
        var host = this.context.workspaceState.get("elastic.host", "localhost:9200")


        var lRange: vscode.Range[] = []
        var mRange: vscode.Range[] = []
        var errRange: vscode.Range[] = []


        var eMatches: ElasticMatch[] = []


        //const requestReg = /^(GET|POST|DELETE|PUT|OPTIONS|PATCH|HEAD)\s+/gim;
        //let matches = requestReg.exec(editor.document.getText());

        // var reg = new RegExp("(GET|POST|DELETE|PUT|OPTIONS|PATCH|HEAD)\s+");
        // var matches = reg.exec(editor.document.getText());


        //editor.setDecorations(highlight, [range]);
        let highlight = vscode.window.createTextEditorDecorationType({
            color: 'rgb(0,200,100)',
            light: {
                after: { contentText: ' • ' + host, color: 'lightgray' }
            },
            dark: {
                after: { contentText: ' • ' + host, color: 'gray' }
            }
        });

        // let bb = vscode.window.createTextEditorDecorationType({

        //     gutterIconPath: this.context.asAbsolutePath("./image/glu.svg"),

        //     isWholeLine: true,
        //     overviewRulerLane: vscode.OverviewRulerLane.Full,
        // })

        let bHighlight = vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            gutterIconPath: vscode.Uri.parse('data:image/svg+xml;base64,PHN2ZyB4b+'),
            gutterIconSize: 'contain',

            light: {
                backgroundColor: 'rgba(180,180,200,0.1)'
            },
            dark: {
                backgroundColor: 'rgba(50,50,50,0.1)'
            }
        });

        let mHighlight = vscode.window.createTextEditorDecorationType({
            color: 'rgb(255,100,100)',
            overviewRulerColor: 'blue',
            overviewRulerLane: vscode.OverviewRulerLane.Full
        });

        let errHighlight = vscode.window.createTextEditorDecorationType({
            border: '1px dashed red'
        });

        editor.setDecorations(highlight, []);
        editor.setDecorations(mHighlight, []);
        editor.setDecorations(errHighlight, []);
        //editor.setDecorations(bHighlight, []);

        var vir = false


        for (var i = 0; i < editor.document.lineCount; i++) {
            var line = editor.document.lineAt(i);
            var tl = line.text.trim()

            if (vir && tl.startsWith('{')) {
                eMatches[eMatches.length - 1].HasBody = true
            }

            vir = false


            // https://stackoverflow.com/a/1547940/1495442
            var regexp = /^(GET|POST|DELETE|PUT|OPTIONS|PATCH|HEAD)\s+([A-Za-z0-9\-._~:\/#\[\]@!$&'\(\)\*+,;=`]+$)/gim;
            var match = regexp.exec(line.text);

            if (match != null) {
                let lrange = new vscode.Range(i, match[1].length + 1, i, line.text.length);
                let mrange = new vscode.Range(i, 0, i, match[1].length);
                let em = new ElasticMatch({ Text: match[1], Range: mrange });

                em.Path = { Text: match[2], Range: lrange }

                vir = true

                eMatches.push(em)
                lRange.push(lrange);
                mRange.push(mrange);
            }
        }

        editor.setDecorations(mHighlight, mRange);
        editor.setDecorations(highlight, lRange);


        // "⚡ ↯ ▷↓↑ Lint"

        var ret = [];

        eMatches.forEach(em => {

            ret.push(new vscode.CodeLens(em.Method.Range, {
                title: "▶ Run Query",
                command: "elastic.execute",
                arguments: [em]
            }))

            if (em.HasBody && em.ErrorPosition == null) {
                ret.push(new vscode.CodeLens(em.Method.Range, {
                    title: "⚡ Auto indent",
                    command: "elastic.lint",
                    arguments: [em]
                }))
            }
            else {
                if (em.ErrorPosition != null) {
                    errRange.push(new vscode.Range(em.ErrorPosition, new vscode.Position(em.ErrorPosition.line, em.ErrorPosition.character + 1)))
                    ret.push(new vscode.CodeLens(em.Method.Range, {
                        title: "⚠️ Invalid Json",
                        command: ""
                    }))
                }
            }

        });

        editor.setDecorations(errHighlight, errRange);
        // editor.setDecorations(bHighlight, eMatches.map(b => {return b.Body.Range}));


        return ret;

        //return [new vscode.CodeLens(range, command)]
    }
}