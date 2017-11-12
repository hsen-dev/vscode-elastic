'use script';

import * as vscode from 'vscode';
import * as request from 'request';
import { Range } from 'vscode';
import url = require('url');
import { Router } from 'fast-router';
import closestSemver = require('semver-closest')

const PATH_REGEX = /^(GET|POST|PUT|DELETE|HEAD) +(.+)$/;

export class ElasticCompletionItemProvider implements vscode.CompletionItemProvider {

    private readonly context: vscode.ExtensionContext;
    private readonly restSpec: any;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        this.restSpec = this.buildRestSpecRouter();
    }

    private buildRestSpecRouter() {
        const restSpec = require('./rest-spec').default;
        const versions = Object.keys(restSpec);
        const result = {};

        versions.forEach(version => {
            const endpointDescriptions = restSpec[version].default;
            const common = endpointDescriptions._common;
            delete endpointDescriptions._common;
            const endpointNames = Object.keys(endpointDescriptions);

            const router = new Router();
            result[version] = router;

            endpointNames.forEach(endpointName => {
                const endpointDescription = endpointDescriptions[endpointName];
                const paths = endpointDescription.url.paths.map(path => path.replace(/\{/g, ':').replace(/\}/g, ''));
                const methods = endpointDescription.methods;
                methods.forEach(method => paths
                    .forEach(path => router
                    .addRoute(`/${method}/${path}`, endpointDescription)));
            });
        });

        return result;
    }

provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        return this.getElasticVersion().then(esVersion => {
            if (!esVersion)
                return [];
    
            let apiVersion = closestSemver(esVersion, Object.keys(this.restSpec));
            console.log(apiVersion);
            return [];
        });
        /*let restSpec = this.restSpec[]

        let currentLine = this.getCurrentLine(document, position);
        let parsedPath = this.parsePath(currentLine);
        
        if (parsedPath)
            return this.providePathCompletionItems(parsedPath, apiVersion); 

        return [ ];*/
    }

    private getCurrentLine(document: vscode.TextDocument, position: vscode.Position): string {
        return document.getText(new Range(position.with({ character: 0 }), position));
    }


    private providePathCompletionItems(parsedPath: RegExpMatchArray, restSpec: any): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        let path = parsedPath[2].trim();
        return [];
    }

    private parsePath(text: string): RegExpMatchArray {
        return PATH_REGEX.exec(text);
    }

    //private lookupEndpoint(esVersion: string, )

    private async getElasticVersion(): Promise<string> {
        const host: string = this.context.workspaceState.get("elastic.host", null);
        const requestUrl: string = url.format({ host, pathname: '/', protocol: 'http' });
        return new Promise<string>((resolve, reject) => {
            request(<request.UrlOptions & request.CoreOptions>{
                url: requestUrl, method: 'GET', body: '/',
                headers: { 'Content-Type': 'application/json' }
            }, (error, response, body) => {
                try {
                    resolve(JSON.parse(body).version.number);
                } catch(e) {
                    resolve(null);
                }
            })
        });
       }
    /*resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        throw new Error("Method not implemented.");
    }*/

}



