import { ElasticMatch } from './ElasticMatch';
'use script';

import * as vscode from 'vscode';
import * as request from 'request';
import { Range, ParameterInformation, commands } from 'vscode';
import url = require('url');
import routington = require('routington');
import closestSemver = require('semver-closest');

export class ElasticCompletionItemProvider implements vscode.CompletionItemProvider {

    private readonly context: vscode.ExtensionContext;
    private readonly restSpec: any;
    private readonly esMatches: any;

    constructor(context: vscode.ExtensionContext, esMatches: any) {
        this.context = context;
        this.esMatches = esMatches;

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

            const router = result[version] = routington();
  
            endpointNames.forEach(endpointName => {
                const endpointDescription = endpointDescriptions[endpointName];
                if (common) {
                    if (endpointDescription.url.params)
                        Object.keys(common.params)
                            .forEach(param => endpointDescription.url.params[param] = common.params[param]);
                    else
                        endpointDescription.url.params = common.params;
                }
                
                const paths = endpointDescription.url.paths.map(path => path.replace(/\{/g, ':').replace(/\}/g, ''));
                const methods = endpointDescription.methods;
                methods.forEach(method => paths
                    .forEach(path => (router.define(`${method}${path}`)[0].spec = endpointDescription)));
            });
        });

        return result;
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        return this.asyncProvideCompletionItems(document, position, token);    
    }

    private async asyncProvideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        
        let esVersion = await this.getElasticVersion();
        if (!esVersion)
            return [];

        let esMatch = this.findActiveESMatch(position);
        if (!esMatch)
            return [];

        let apiVersion = closestSemver(esVersion, Object.keys(this.restSpec));
        let restSpec = this.restSpec[apiVersion];
        if (!restSpec)
            return [];
        
        if (this.isPathCompletion(esMatch, position))
            return this.providePathCompletionItem(esMatch, restSpec);    
        else if (this.isPathParamCompletion(esMatch, position))
            return this.providePathParamCompletionItem(esMatch, restSpec);    
            
        console.log(esMatch.Body.Text);
        
        return [];
    }

    private async providePathParamCompletionItem(esMatch: any, restSpec: any): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        const match = restSpec.match(`${esMatch.Method.Text}${esMatch.Path.Text.split('?')[0]}`);
        if (!match)
            return [];
        return Object.keys(match.node.spec.url.params)
            .map(param => new vscode.CompletionItem(param));
    }        

    private async providePathCompletionItem(esMatch: any, restSpec: any): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        let parts = esMatch.Path.Text.split('/').filter(part => part.length);
        let parent = restSpec.child[esMatch.Method.Text];
        let grandParent;

        parts.forEach(part => {
            if (!parent) return;
            grandParent = parent;
            parent = part in parent.child ?
                parent.child[part] :
                parent.children[0];
        });

        if (!parent) return [];

        let result = [];
        let variable = parent.children[0];

        if (variable) {
            if (variable.name == 'index') {
                result = result.concat((await this.listIndices()).map(index => ({
                    label: index
                })));
                result = result.concat((await this.listAliases()).map(index => ({
                    label: index
                })));
            } else if (variable.name == 'name' && grandParent && grandParent.string === '_alias')
                result = result.concat((await this.listAliases()).map(index => ({
                    label: index
                })));
            else if (variable.name == 'repository')
                result = result.concat((await this.listRepositories()).map(repository => ({
                    label: repository
                })));
            else
                result.push({ label: `<${variable.name}>`});
        }

        result = result.concat(Object.keys(parent.child).map(child => ({
            label: child
        })));
            
        return result.filter(part => part.label.length)
            .map(part => new vscode.CompletionItem(part.label));
    }

    private findActiveESMatch(position: vscode.Position): ElasticMatch {
        return this.esMatches.list.find((esMatch: ElasticMatch) => {
            if (position.line >= esMatch.Method.Range.start.line &&
                (!esMatch.HasBody || position.line <= esMatch.Body.Range.end.line))
                    return esMatch;
            return null;
        });
    }

    private isPathCompletion(esMatch: ElasticMatch, position: vscode.Position): boolean {
        return esMatch.Method.Range.start.line === position.line &&
               esMatch.Path.Text[esMatch.Path.Text.length - 1] === '/';
    }

    private isPathParamCompletion(esMatch: ElasticMatch, position: vscode.Position): boolean {
        return esMatch.Method.Range.start.line === position.line &&
               (esMatch.Path.Text[esMatch.Path.Text.length - 1] === '?' ||
               esMatch.Path.Text[esMatch.Path.Text.length - 1] === '&');
    }
    //private lookupEndpoint(esVersion: string, )

    private async listIndices() : Promise<string[]> {
        const host: string = this.context.workspaceState.get("elastic.host", null);
        const requestUrl: string = url.format({ host, pathname: '/_cat/indices', protocol: 'http' });
        return new Promise<string[]>((resolve, reject) => {
            request(<request.UrlOptions & request.CoreOptions>{
                url: requestUrl + '?format=json', method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }, (error, response, body) => {
                try {
                    resolve(JSON.parse(body).map(entry => entry.index));
                } catch(e) {
                    resolve([]);
                }
            })
        });
    }
    private async listAliases() : Promise<string[]> {
        const host: string = this.context.workspaceState.get("elastic.host", null);
        const requestUrl: string = url.format({ host, pathname: '/_cat/aliases', protocol: 'http' });
        return new Promise<string[]>((resolve, reject) => {
            request(<request.UrlOptions & request.CoreOptions>{
                url: requestUrl + '?format=json', method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }, (error, response, body) => {
                try {
                    resolve(JSON.parse(body).map(entry => entry.alias));
                } catch(e) {
                    resolve([]);
                }
            })
        });
    }

    private async listRepositories() : Promise<string[]> {
        const host: string = this.context.workspaceState.get("elastic.host", null);
        const requestUrl: string = url.format({ host, pathname: '/_snapshot', protocol: 'http' });
        return new Promise<string[]>((resolve, reject) => {
            request(<request.UrlOptions & request.CoreOptions>{
                url: requestUrl, method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }, (error, response, body) => {
                try {
                    resolve(Object.keys(JSON.parse(body)));
                } catch(e) {
                    resolve([]);
                }
            })
        });
    }

    private async getElasticVersion(): Promise<string> {
        const host: string = this.context.workspaceState.get("elastic.host", null);
        const requestUrl: string = url.format({ host, pathname: '/', protocol: 'http' });
        return new Promise<string>((resolve, reject) => {
            request(<request.UrlOptions & request.CoreOptions>{
                url: requestUrl, method: 'GET',
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



