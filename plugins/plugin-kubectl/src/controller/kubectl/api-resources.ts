/*
 * Copyright 2020 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Arguments, Registrar, KResponse, isTable } from '@kui-shell/core'

import flags from './flags'
import { exec } from './exec'
import commandPrefix from '../command-prefix'
import { KubeOptions } from './options'
import { stringToTable } from '../../lib/view/formatTable'
import { isUsage, doHelp } from '../../lib/util/help'

export const doGet = (command: string) => async (args: Arguments<KubeOptions>): Promise<KResponse> => {
  if (isUsage(args)) {
    return doHelp(command, args)
  } else {
    // first, we do the raw exec of the given command
    const response = await exec(args, undefined, command)

    const {
      content: { stderr, stdout }
    } = response

    const table = stringToTable(stdout, stderr, args, command, 'explain')

    if (isTable(table)) {
      table.body.forEach(_ => {
        const name = (_.attributes[3] && _.attributes[3].value) || _.name
        _.onclick = `${command} explain ${name}`
      })

      table.body.sort((a, b) => a.name.localeCompare(b.name))
    }

    return table
  }
}

export default (registrar: Registrar) => {
  registrar.listen(`/${commandPrefix}/kubectl/api-resources`, doGet('kubectl'), flags)
  registrar.listen(`/${commandPrefix}/k/api-resources`, doGet('kubectl'), flags)
}
