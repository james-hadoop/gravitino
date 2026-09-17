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

export const tablePreviewPath = ({ metalake, catalog, schema, table }) =>
  `/api/metalakes/${encodeURIComponent(metalake)}/catalogs/${encodeURIComponent(catalog)}/schemas/${encodeURIComponent(
    schema
  )}/tables/${encodeURIComponent(table)}/preview`

export const buildTablePreviewColumns = columns =>
  columns.map((name, index) => ({
    title: name,
    dataIndex: String(index),
    key: String(index),
    ellipsis: true,
    width: 180
  }))

export const calculatePreviewColumnWidth = (name, rows, columnIndex, measureText, minWidth = 80, maxWidth = 600) => {
  const values = [name, ...rows.map(row => row[columnIndex]).filter(value => value !== null && value !== undefined)]
  const contentWidth = Math.max(...values.map(value => measureText(String(value)))) + 48

  return Math.min(maxWidth, Math.max(minWidth, Math.ceil(contentWidth)))
}
