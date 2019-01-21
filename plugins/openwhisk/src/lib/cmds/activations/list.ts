/*
 * Copyright 2018 IBM Corporation
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

import * as Debug from 'debug'
const debug = Debug('plugins/openwhisk/activations/list')

import repl = require('@kui/core/core/repl')

import { isHeadless } from '@kui/core/core/capabilities'
import { registerListView } from '@kui/core/webapp/cli'

import { activations as usage } from '../openwhisk-usage'
import { renderActivationListView } from '../../views/cli/activations/list'

interface IOptions {
  docs: boolean
  limit: number
  skip?: number
  name?: string
}

/**
 * Pattern that matches /a/b/c, and captures the b/c part. It is
 * optional on the b part, and thus will match /a/c while capturing c.
 *
 */
const fqnPattern = /^\/[^/]+\/(([^/]+\/)?.*)$/

/** unless the user asks for a limit explicitly, let's use a fairly low default limit */
const baseOptions: IOptions = {
  limit: 10,
  docs: false
}

/**
 * The activation list impl.
 *
 * WARNING: do not extract the wsk.ow field in the outer closure here,
 * as it may be updated over time.
 *
 */
const doList = wsk => async ({ command, argvNoOptions, parsedOptions, execOptions }) => {
  debug('command', command)
  debug('skip', parsedOptions.skip)
  debug('limit', parsedOptions.limit)

  const name = argvNoOptions[argvNoOptions.indexOf('list') + 1]
  if (name) {
    const fqnMatch = name.match(fqnPattern)
    if (fqnMatch) {
      // openwhisk activation queries don't support FQN, only
      // package/action or action
      parsedOptions.name = fqnMatch[1]
    } else {
      parsedOptions.name = name
    }

    debug('adding positional parameter name', parsedOptions)
  }

  const opts = Object.assign({}, baseOptions, wsk.owOpts(parsedOptions, execOptions))
  delete opts._

  try {
    const list = await wsk.ow.activations.list(opts)
      .then(L => L.map(wsk.addPrettyType('activations', 'list')))

    return list
  } catch (err) {
    throw err
  }
}

export default (commandTree, wsk) => {
  if (!isHeadless()) {
    registerListView('activations', renderActivationListView)

    // for now, until we have updated the composer plugin
    registerListView('session', renderActivationListView)
  }

  wsk.synonyms('activations').forEach(syn => {
    commandTree.listen(`/wsk/${syn}/list`, doList(wsk), { usage: usage(syn).available.find(({ command }) => command === 'list') })
  })
}
