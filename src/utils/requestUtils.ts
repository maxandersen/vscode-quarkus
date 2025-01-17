/**
 * Copyright 2019 Red Hat, Inc. and others.

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as request from 'request-promise';
import * as yauzl from 'yauzl';
import * as p from 'path';
import * as fs from 'fs';

import { Config } from '../Config';
import { ProjectGenState } from '../definitions/inputState';
import { QExtension, APIExtension } from '../definitions/QExtension';
import { Readable } from 'stream';
import { convertToQExtension } from '../definitions/QExtension';

export async function getQExtensions(): Promise<QExtension[]> {
  const apiUrl: string = Config.getApiUrl();
  const extensions: string = await tryGetExtensionsJSON(apiUrl);
  const qExtensions: QExtension[] = JSON.parse(extensions).map((ext: APIExtension) => {
    return convertToQExtension(ext);
  });
  const noDuplicates: QExtension[] = removeDuplicateArtifactIds(qExtensions);
  return noDuplicates.sort((a, b) => a.name.localeCompare(b.name));
}

async function tryGetExtensionsJSON(apiUrl: string): Promise<string> {
  const requestOptions = {
    uri: `${apiUrl}/extensions`,
    timeout: 30000
  };
  try {
    return await request(requestOptions);
  } catch (err) {
    throw 'Unable to download Quarkus project.';
  }
}

function removeDuplicateArtifactIds(extensions: QExtension[]): QExtension[] {
  const ids: Set<string> = new Set();

  return extensions.reduce((accumulator: QExtension[], extension: QExtension) => {
    if (!ids.has(extension.artifactId)) {
      ids.add(extension.artifactId);
      accumulator.push(extension);
    }
    return accumulator;
  }, [] as QExtension[]);
}

export async function downloadProject(state: ProjectGenState) {
  const apiUrl: string = Config.getApiUrl();
  const chosenExtArtifactIds: string[] = state.extensions!.map((it) => it.artifactId);
  const chosenIds: string[] = chosenExtArtifactIds.map((artifactId) => {
    return 'io.quarkus:' + artifactId;
  });

  const qProjectUrl: string = `${apiUrl}/download?` +
    `g=${state.groupId}&` +
    `a=${state.artifactId}&` +
    `v=${state.projectVersion}&` +
    `c=${state.packageName}.${state.resourceName}&` +
    `e=${chosenIds.join('&e=')}`;

  const buffer: Buffer = await tryGetProjectBuffer(qProjectUrl);
  await extract(buffer, state.targetDir!.fsPath);
}

async function tryGetProjectBuffer(projectUrl: string): Promise<Buffer> {
  try {
    return await request(projectUrl, {encoding: null}) as Buffer;
  } catch (err) {
    throw 'Unable to download Quarkus project.';
  }
}

const yauzlFromBuffer = promisify(yauzl.fromBuffer);

function promisify(api) {
  return (...args) => {
    return new Promise((resolve, reject) => {
      api(...args, (err, response) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  };
}

async function extract(content: Buffer, path: string) {
  const zipfile: yauzl.ZipFile = (await yauzlFromBuffer(content, {lazyEntries: true})) as yauzl.ZipFile;
  const openReadStream = promisify(zipfile.openReadStream.bind(zipfile));

  zipfile.readEntry();

  zipfile.on("entry", async (entry) => {
    if (entry.fileName !== "/") {
      const mappedPath = p.resolve(path, p.normalize(entry.fileName));
      if (entry.fileName.endsWith("/")) {
        fs.mkdirSync(mappedPath);
      } else {
        const stream: Readable = (await openReadStream(entry)) as Readable;
        stream.pipe(fs.createWriteStream(mappedPath, {mode: entry.externalFileAttributes >>> 16}));
      }
    }
    zipfile.readEntry();
  });
}