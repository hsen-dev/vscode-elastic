/*jslint esversion: 6*/
const del = require('del');
const fs = require('fs');
const jsesc = require('jsesc');
(function () {
    'use strict';

    const SRC_ROOT = `${__dirname}/../src/rest-spec`;

    del.sync(`${SRC_ROOT}/**/*.ts`);
    fs.writeFileSync(`${SRC_ROOT}/json.d.ts`, 'declare module "*.json" { const value: any; export default value; }');

    const requireDir = require('require-dir');
    const restSpec = requireDir('../src/rest-spec', {recurse: true});

    let rootIndex = '';

    let versions = Object.keys(restSpec);
    versions.forEach(version => {
        rootIndex += `import * as ${version} from './${version}';\n`;
        let endpointNames = Object.keys(restSpec[version]);
        let versionIndex = endpointNames
            .map(endpointName => `const def_${endpointName.replace(/\./g, '_')} = JSON.parse('${jsesc(JSON.stringify(restSpec[version][endpointName]))}')`)
            .join(';\n');
        
        versionIndex += `\n\nexport default {\n`;
        versionIndex += endpointNames
            .map(endpointName => `  '${endpointName}': def_${endpointName.replace(/\./g, '_')}` +
                (endpointName != '_common' ? `['${endpointName}']` : ''))
            .join(',\n');
        versionIndex += '\n}';
        fs.writeFileSync(`${SRC_ROOT}/${version}/index.ts`, versionIndex, 'utf-8');
    });

    rootIndex += `\nexport default {\n`;
    rootIndex += versions
        .map(version => `  '${version.substring(1).replace(/_/g, '.')}': ${version}`)
        .join(',\n');
    rootIndex += '\n}';

    fs.writeFileSync(`${SRC_ROOT}/index.ts`, rootIndex, 'utf-8');
}());