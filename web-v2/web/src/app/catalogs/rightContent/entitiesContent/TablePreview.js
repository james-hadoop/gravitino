/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Empty, Spin, Table, Typography } from 'antd'
import { getTablePreviewApi } from '@/lib/api/tables'
import { buildTablePreviewColumns, calculatePreviewColumnWidth } from '@/lib/table-preview'

const { Text } = Typography
const MIN_COLUMN_WIDTH = 80
const MAX_COLUMN_WIDTH = 600

const ResizablePreviewHeaderCell = ({ width, cellKey, onResize, onAutoFit, children, style, ...restProps }) => {
  const handleMouseDown = event => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startWidth = width

    const handleMouseMove = moveEvent => {
      const nextWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX))
      onResize(cellKey, nextWidth)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.documentElement.style.cursor = ''
    }

    document.body.style.userSelect = 'none'
    document.documentElement.style.cursor = 'col-resize'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <th {...restProps} style={{ ...style, width, minWidth: width, position: 'relative' }}>
      {children}
      <div
        role='separator'
        aria-orientation='vertical'
        title='Drag to resize; double-click to fit content'
        onMouseDown={handleMouseDown}
        onDoubleClick={event => {
          event.preventDefault()
          event.stopPropagation()
          onAutoFit(cellKey)
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: -4,
          zIndex: 2,
          width: 8,
          height: '100%',
          cursor: 'col-resize',
          borderRight: '1px solid transparent'
        }}
      />
    </th>
  )
}

export default function TablePreview({ metalake, catalog, schema, table }) {
  const [preview, setPreview] = useState({ columns: [], rows: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [columnWidths, setColumnWidths] = useState({})

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    getTablePreviewApi({ metalake, catalog, schema, table })
      .then(response => {
        if (active) {
          setPreview({ columns: response?.columns || [], rows: response?.rows || [] })
          setColumnWidths({})
        }
      })
      .catch(reason => {
        if (active) setError(reason?.message?.message || reason?.message || String(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [metalake, catalog, schema, table])

  const handleResize = useCallback((key, width) => {
    setColumnWidths(current => ({ ...current, [key]: width }))
  }, [])

  const handleAutoFit = useCallback(
    key => {
      const columnIndex = Number(key)
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      const measureText = value => {
        if (!context) return value.length * 8
        context.font = getComputedStyle(document.body).font || '14px sans-serif'

        return context.measureText(value).width
      }

      const width = calculatePreviewColumnWidth(
        preview.columns[columnIndex],
        preview.rows,
        columnIndex,
        measureText,
        MIN_COLUMN_WIDTH,
        MAX_COLUMN_WIDTH
      )
      handleResize(key, width)
    },
    [handleResize, preview.columns, preview.rows]
  )

  const columns = useMemo(
    () =>
      buildTablePreviewColumns(preview.columns).map(column => {
        const width = columnWidths[column.key] || column.width

        return {
          ...column,
          width,
          onHeaderCell: () => ({
            width,
            cellKey: column.key,
            onResize: handleResize,
            onAutoFit: handleAutoFit
          })
        }
      }),
    [columnWidths, handleAutoFit, handleResize, preview.columns]
  )

  const rows = useMemo(
    () =>
      preview.rows.map((values, rowIndex) => ({
        key: rowIndex,
        ...Object.fromEntries(values.map((value, columnIndex) => [String(columnIndex), value]))
      })),
    [preview.rows]
  )

  if (error) return <Alert type='error' showIcon message='Failed to load table preview' description={error} />

  return (
    <Spin spinning={loading}>
      {!loading && rows.length === 0 ? (
        <Empty description='No rows' />
      ) : (
        <>
          <Text type='secondary'>Showing up to 100 rows.</Text>
          <Table
            className='mt-3'
            dataSource={rows}
            columns={columns}
            components={{ header: { cell: ResizablePreviewHeaderCell } }}
            pagination={false}
            size='small'
            scroll={{ x: Math.max(columns.reduce((sum, column) => sum + column.width, 0), 600), y: 'calc(100vh - 35rem)' }}
          />
        </>
      )}
    </Spin>
  )
}
