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

import { Uri } from 'vscode';
import { QExtension } from './QExtension';

export interface State {
  totalSteps: number;
  extensions: QExtension[];
  wizardInterrupted?: Interrupted;
}

/**
 * Class representing data required to generate project
 */
export interface ProjectGenState extends State {
  groupId: string;
  artifactId: string;
  projectVersion: string;
  packageName: string;
  resourceName: string;
  targetDir: Uri;
}

export interface AddExtensionsState extends State {
  pomPath: Uri;
}

export interface Interrupted {
  reason: string;
}