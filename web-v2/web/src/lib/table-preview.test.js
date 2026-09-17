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
import { buildTablePreviewColumns, calculatePreviewColumnWidth, tablePreviewPath } from './table-preview'

describe('table preview', () => {
  it('builds a safely encoded preview endpoint', () => {
    expect(
      tablePreviewPath({ metalake: 'lake/a', catalog: 'catalog name', schema: 'schema#1', table: 'table?1' })
    ).toBe('/api/metalakes/lake%2Fa/catalogs/catalog%20name/schemas/schema%231/tables/table%3F1/preview')
  })

  it('creates scrollable columns from returned names', () => {
    expect(buildTablePreviewColumns(['id', 'display name'])).toEqual([
      { title: 'id', dataIndex: '0', key: '0', ellipsis: true, width: 180 },
      { title: 'display name', dataIndex: '1', key: '1', ellipsis: true, width: 180 }
    ])
  })

  it('fits a column to its widest header or cell within bounds', () => {
    const rows = [
      ['1', 'short'],
      ['2', 'the longest visible value']
    ]
    const measureText = value => value.length * 10

    expect(calculatePreviewColumnWidth('name', rows, 1, measureText)).toBe(298)
    expect(calculatePreviewColumnWidth('id', rows, 0, measureText)).toBe(80)
    expect(calculatePreviewColumnWidth('large', [['x'.repeat(100)]], 0, measureText)).toBe(600)
  })
})
