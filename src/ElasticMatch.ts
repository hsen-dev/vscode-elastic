import * as vscode from 'vscode';
import { ElasticContentProvider } from './ElasticContentProvider'
import * as path from 'path';
import * as fs from 'fs';
import * as stripJsonComments from 'strip-json-comments';

export class ElasticItem {
    public Range: vscode.Range
    public Text: string
}

export class ElasticMatch {

    Error: ElasticItem
    Path: ElasticItem
    Body: ElasticItem
    Method: ElasticItem
    File: ElasticItem
    HasBody: boolean = false

    public constructor(Method: ElasticItem) {
        this.Method = Method;
        this.Body = new ElasticItem()
        this.Error = new ElasticItem()

        const editor = vscode.window.activeTextEditor;

        let lm = 1
        let txt = ""
        let line = this.Method.Range.start.line + 1
        let ln = line

        while (editor.document.lineCount > ln && editor.document.lineAt(ln).text.trim().length > 0) {
            txt += editor.document.lineAt(ln).text + "\n"
            lm = editor.document.lineAt(ln).text.length
            ln++;
        }

        var ggg = path.join(path.dirname(editor.document.uri.fsPath), )

        txt = txt.substring(0, txt.length - 1)

        let sp = new vscode.Position(line, 0)
        let ep = new vscode.Position(ln - 1, lm)
        this.Body.Range = new vscode.Range(sp, ep)

        let jsonText = txt

        if (txt.startsWith("!")) {
            this.File = new ElasticItem()
            this.File.Range = new vscode.Range(line, 1, line, editor.document.lineAt(line).text.trim().length)
            var fPath = txt.substring(1).trim()
            if (!path.isAbsolute(fPath)) {
                fPath = path.join(path.dirname(editor.document.uri.fsPath), fPath)
            }

            if (fs.existsSync(fPath)) {
                jsonText = fs.readFileSync(fPath).toString()
                this.File.Text = fPath
            }
        }



        try {
            JSON.parse(stripJsonComments(jsonText))
            this.HasBody = true
            this.Body.Text = txt
        } catch (error) {
            console.error(error.message)
            this.HasBody = false
            this.Error.Text = error.message
            this.Error.Range = this.GetErrorRangeFromMessage(txt, error.message)
        }
    }

    GetErrorRangeFromMessage(text: string, message: string): vscode.Range {
        var regexp = /Position\s(\d+)/gim;
        var match = regexp.exec(message);
        if (match) {
            var pos = +match[1]
            text = text.substring(0, pos)
            var lines: string[] = text.split("\n")
            var char = lines[lines.length - 1].length
            var line = lines.length + this.Method.Range.start.line;
            return new vscode.Range(line, char, line, char + 1)
        }

        return null;
    }



}








