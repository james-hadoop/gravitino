/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { describe, expect, it } from 'vitest'
import { isFilesystemBrowsingDisabled, resolveFilesetActiveTab } from './fileset-tabs'

describe('fileset tab selection', () => {
  it('disables file browsing when the catalog forbids filesystem operations', () => {
    const catalog = { properties: { 'disable-filesystem-ops': 'true' } }

    expect(isFilesystemBrowsingDisabled(catalog)).toBe(true)
    expect(resolveFilesetActiveTab({ catalog, activeTab: 'files' })).toBe('')
  })

  it('keeps file browsing enabled for a catalog without the restriction', () => {
    const catalog = { properties: {} }

    expect(isFilesystemBrowsingDisabled(catalog)).toBe(false)
    expect(resolveFilesetActiveTab({ catalog, activeTab: '' })).toBe('files')
  })

  it('does not enable files while catalog details are still loading', () => {
    expect(resolveFilesetActiveTab({ catalog: null, activeTab: '' })).toBe('')
  })

  it('preserves non-file tabs when filesystem operations are disabled', () => {
    const catalog = { properties: { 'disable-filesystem-ops': 'true' } }

    expect(resolveFilesetActiveTab({ catalog, activeTab: 'Associated Roles' })).toBe('Associated Roles')
  })
})
