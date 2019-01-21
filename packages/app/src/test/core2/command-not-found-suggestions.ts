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

import * as assert from 'assert'

import { ISuite } from '@kui/core/tests/lib/common'
import * as common from '@kui/core/tests/lib/common' // tslint:disable-line:no-duplicate-imports
import * as ui from '@kui/core/tests/lib/ui'
const { cli, selectors, sidecar } = ui

import { expectedVersion } from '../core1/version'

/**
 *
 * - Type the command
 * - Expect a command not found
 * - Expect the given list of available related commands
 * - Optionally click on a given "click" index of the available list
 * - If so, then either: expect the subsequent command output to have the given terminal breadcrumb in its usage message
 *                   or: expect the sidecar icon to be "sidecar"
 *
 */
export const expectSuggestionsFor = function (cmd, expectedAvailable, { click = undefined, expectedBreadcrumb = undefined, sidecar: expectedIcon = undefined, expectedString = undefined } = {}) {
  return cli.do(cmd, this.app)
    .then(cli.expectError(404, 'Command not found', true)) // true means we want N back rather than app
    .then(N => {
      const base = `${ui.selectors.OUTPUT_N(N)} .user-error-available-commands .log-line`
      const availableItems = `${base} .clickable`

      return this.app.client.getText(availableItems)
        .then(ui.expectArray(expectedAvailable))
        .then(() => {
          if (click !== undefined) {
            // then click on the given index; note that nth-child is 1-indexed, hence the + 1 part
            const clickOn = `${base}:nth-child(${click + 1}) .clickable`

            return this.app.client.click(clickOn)
              .then(() => {
                if (expectedBreadcrumb) {
                  //
                  // then expect the next command to have the given terminal breadcrumb
                  //
                  const breadcrumb = `${ui.selectors.OUTPUT_N(N + 1)} .bx--breadcrumb-item:last-child .bx--no-link`
                  return this.app.client.getText(breadcrumb)
                    .then(actualBreadcrumb => assert.strictEqual(actualBreadcrumb, expectedBreadcrumb))
                } else if (expectedIcon) {
                  //
                  // then wait for the sidecar to be open and showing the expected sidecar icon text
                  //
                  const icon = `${ui.selectors.SIDECAR} .sidecar-header-icon-wrapper .sidecar-header-icon`
                  return sidecar.expectOpen(this.app)
                    .then(() => this.app.client.getText(icon))
                    .then(actualIcon => actualIcon.toLowerCase())
                    .then(actualIcon => assert.strictEqual(actualIcon, expectedIcon))
                } else if (expectedString) {
                  //
                  // then wait for the given command output
                  //
                  return this.app.client.waitUntil(async () => {
                    const text = await this.app.client.getText(ui.selectors.OUTPUT_N(N + 1))
                    return text === expectedString
                  })
                }
              })
          }
        })
    })
    .catch(common.oops(this))
}

describe('Suggestions for command not found', function (this: ISuite) {
  before(common.before(this))
  after(common.after(this))

  it('should have an active repl', () => cli.waitForRepl(this.app))

  it('should present suggestions for "ne" -> new', () => {
    return expectSuggestionsFor.call(this,
                                     'ne', // type this
                                     ['new'] // expect these completions
                                    )
  })

  it('should present suggestions for "edi" -> edit', () => {
    return expectSuggestionsFor.call(this,
                                     'edi', // type this
                                     ['edit'] // expect these completions
                                    )
  })

  it('should present suggestions for "versio" -> version', () => {
    return expectSuggestionsFor.call(this,
                                     'versio', // type this
                                     ['version'] // expect these completions
                                    )
  })
})
