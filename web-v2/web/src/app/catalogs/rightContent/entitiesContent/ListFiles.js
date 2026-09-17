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

import { useEffect, useState, useMemo, useCallback } from 'react'

import { ArrowLeftOutlined, CopyOutlined, FileOutlined, FolderOutlined, EyeOutlined } from '@ant-design/icons'
import { App, Button, Modal, Select, Space, Spin, Table, Typography } from 'antd'

// import { useListFilesByFileset } from '@/hooks'
import { copyToClipboard, formatFileSize, formatLastModified, to } from '@/lib/utils'
import { useAppSelector, useAppDispatch } from '@/lib/hooks/useStore'
import { useAntdColumnResize } from 'react-antd-column-resize'
import { getFilesetFiles } from '@/lib/store/metalakes'
import { readFilesetFileContentApi } from '@/lib/api/filesets'
import FileBinaryPreviewModal, {
  PREVIEWABLE_BINARY,
  PREVIEWABLE_OFFICE,
  PREVIEWABLE_IMAGE
} from './FileBinaryPreviewModal'

const { Option } = Select
const { Text, Link } = Typography

// maximum bytes fetched for one preview
const MAX_PREVIEW_BYTES = 512 * 1024

// extensions considered plain-text previewable
const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|log|csv|tsv|json|ya?ml|xml|html?|css|js|ts|py|java|sql|conf|ini|properties|sh|env|toml)$/i

const ListFiles = ({ metalake, catalog, schema, fileset, storageLocations, defaultLocationName }) => {
  const [currentLocation, setCurrentLocation] = useState(undefined)
  const [sub_path, setSubPath] = useState('')
  const [pathSegments, setPathSegments] = useState([])
  const [files, setFiles] = useState([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewTruncated, setPreviewTruncated] = useState(false)

  const [ctrlPressed, setCtrlPressed] = useState(false)

  useEffect(() => {
    const onKeyDown = e => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setCtrlPressed(true)
      }
    }

    const onKeyUp = e => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setCtrlPressed(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const [binaryPreviewOpen, setBinaryPreviewOpen] = useState(false)
  const [binaryPreviewFile, setBinaryPreviewFile] = useState(null)
  const { message } = App.useApp()
  const store = useAppSelector(state => state.metalakes)
  const dispatch = useAppDispatch()

  // Sync currentLocation with storageLocations/defaultLocationName.
  // When currentLocation is undefined or no longer exists in
  // storageLocations, derive the correct value from props.
  useEffect(() => {
    if (!storageLocations || Object.keys(storageLocations).length === 0) {
      setCurrentLocation(undefined)

      return
    }

    // If currentLocation is valid in current storageLocations, keep it
    if (currentLocation && storageLocations[currentLocation]) {
      return
    }

    // Otherwise, derive from props
    if (defaultLocationName && storageLocations[defaultLocationName]) {
      setCurrentLocation(defaultLocationName)
    } else {
      setCurrentLocation(Object.keys(storageLocations)[0])
    }
  }, [currentLocation, defaultLocationName, storageLocations])

  useEffect(() => {
    if (sub_path) {
      setPathSegments(sub_path.split('/').filter(p => p))
    } else {
      setPathSegments([])
    }
  }, [sub_path])

  useEffect(() => {
    if (metalake && catalog && schema && fileset && currentLocation && storageLocations?.[currentLocation]) {
      let active = true
      setFiles([])

      dispatch(
        getFilesetFiles({
          metalake,
          catalog,
          schema,
          fileset,
          subPath: sub_path,
          locationName: currentLocation
        })
      ).then(action => {
        if (active && getFilesetFiles.fulfilled.match(action)) {
          setFiles(action.payload.files || [])
        }
      })

      return () => {
        active = false
      }
    }
  }, [dispatch, metalake, catalog, schema, fileset, sub_path, currentLocation])

  const handleLocationChange = value => {
    setCurrentLocation(value)
    setSubPath('')
  }

  const handlePathSegmentClick = index => {
    const newSubPath = pathSegments.slice(0, index + 1).join('/')
    setSubPath(newSubPath)
  }

  const handleDirectoryClick = dirName => {
    const newSubPath = sub_path ? `${sub_path}/${dirName}` : dirName
    setSubPath(newSubPath)
  }

  const handleBackClick = () => {
    if (pathSegments.length > 0) {
      const newPathSegments = pathSegments.slice(0, -1)
      setSubPath(newPathSegments.join('/'))
    }
  }

  const isPreviewable = useCallback(record => {
    if (!record || record.isDir) return false

    return (
      TEXT_EXTENSIONS.test(record.name) ||
      PREVIEWABLE_BINARY.test(record.name) ||
      PREVIEWABLE_IMAGE.test(record.name) ||
      PREVIEWABLE_OFFICE.test(record.name) ||
      /\.mobi$/i.test(record.name) ||
      !record.name.includes('.')
    )
  }, [])

  const isBinaryPreview = useCallback(
    record =>
      !!(
        record &&
        !record.isDir &&
        (PREVIEWABLE_BINARY.test(record.name) ||
          PREVIEWABLE_IMAGE.test(record.name) ||
          PREVIEWABLE_OFFICE.test(record.name) ||
          /\.mobi$/i.test(record.name))
      ),
    []
  )

  const handleFilePreview = useCallback(
    async record => {
      const filePath = sub_path ? `${sub_path}/${record.name}` : record.name
      const fullStoragePath = currentFullPath ? `${currentFullPath}/${record.name}` : filePath
      setPreviewFile({ name: record.name, path: fullStoragePath, size: record.size })
      setPreviewContent('')
      setPreviewTruncated(false)
      setPreviewOpen(true)
      setPreviewLoading(true)

      try {
        const [err, res] = await to(
          readFilesetFileContentApi({
            metalake,
            catalog,
            schema,
            fileset,
            subPath: filePath,
            locationName: currentLocation,
            maxLength: MAX_PREVIEW_BYTES
          })
        )
        if (err || !res) {
          throw new Error(err || 'Failed to read file content')
        }
        setPreviewContent(res.content || '')
        setPreviewTruncated((res.content?.length || 0) >= MAX_PREVIEW_BYTES || record.size > MAX_PREVIEW_BYTES)
      } catch (e) {
        message.error(`Failed to read file: ${e.message?.message || e.message || e}`)
        setPreviewOpen(false)
      } finally {
        setPreviewLoading(false)
      }
    },
    [metalake, catalog, schema, fileset, sub_path, currentLocation, message]
  )

  const handleFileClick = useCallback(
    record => {
      if (isBinaryPreview(record)) {
        const filePath = sub_path ? `${sub_path}/${record.name}` : record.name
        const fullStoragePath = currentFullPath ? `${currentFullPath}/${record.name}` : filePath
        setBinaryPreviewFile({ ...record, path: filePath, fullPath: fullStoragePath })
        setBinaryPreviewOpen(true)
      } else {
        handleFilePreview(record)
      }
    },
    [isBinaryPreview, sub_path, handleFilePreview]
  )

  const handleCopyPath = () => {
    if (currentLocation && storageLocations && storageLocations[currentLocation]) {
      const basePath = storageLocations[currentLocation].replace(/\/$/, '')
      const fullPath = sub_path ? `${basePath}/${sub_path}` : basePath
      copyToClipboard(fullPath)
        .then(() => {
          message.success('Path copied!')
        })
        .catch(err => {
          console.error('Failed to copy path: ', err)
          message.error('Failed to copy path')
        })
    }
  }

  const handleCopyContent = () => {
    copyToClipboard(previewContent)
      .then(() => {
        message.success('Content copied!')
      })
      .catch(() => {
        message.error('Failed to copy content')
      })
  }

  const columns = useMemo(
    () => [
      {
        title: 'File Name',
        dataIndex: 'name',
        key: 'name',
        width: 250,
        render: (name, record) => (
          <Space>
            {record.isDir ? <FolderOutlined /> : <FileOutlined />}
            {record.isDir ? (
              <Link onClick={() => handleDirectoryClick(name)}>{name}</Link>
            ) : isPreviewable(record) ? (
              <Link onClick={() => handleFileClick(record)}>{name}</Link>
            ) : (
              <span>{name}</span>
            )}
          </Space>
        )
      },
      {
        title: 'File Type',
        dataIndex: 'type',
        key: 'type',
        width: 150,
        render: (type, record) => (record.isDir ? 'Directory' : 'File')
      },
      {
        title: 'File Size',
        dataIndex: 'size',
        key: 'size',
        width: 200,
        render: size => formatFileSize(size)
      },
      {
        title: 'File Modified Time',
        dataIndex: 'lastModified',
        key: 'lastModified',
        render: lastModified => formatLastModified(lastModified)
      },
      {
        title: '',
        key: 'action',
        width: 80,
        render: (_, record) =>
          !record.isDir && isPreviewable(record) ? (
            <Button
              type='text'
              size='small'
              icon={<EyeOutlined />}
              onClick={() => handleFileClick(record)}
              title='Preview file content'
            />
          ) : null
      }
    ],
    [sub_path, isPreviewable, handleFilePreview]
  )

  const { resizableColumns, components, tableWidth } = useAntdColumnResize(() => {
    return { columns, minWidth: 100 }
  }, [columns])

  if (!storageLocations) {
    return <Spin />
  }

  if (Object.keys(storageLocations).length === 0) {
    return <Text type='secondary'>No storage locations configured</Text>
  }

  if (!currentLocation || !storageLocations[currentLocation]) {
    return <Spin />
  }

  const currentFullPath =
    currentLocation && storageLocations && storageLocations[currentLocation]
      ? `${storageLocations[currentLocation].replace(/\/$/, '')}${sub_path ? `/${sub_path}` : ''}`
      : ''

  return (
    <Spin spinning={store.tableLoading}>
      <Space direction='vertical' style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Text type='secondary' style={{ display: 'flex', alignItems: 'center' }}>
            {sub_path && (
              <Button icon={<ArrowLeftOutlined />} onClick={handleBackClick} type='text' style={{ marginRight: 8 }} />
            )}
            {currentLocation && storageLocations && storageLocations[currentLocation] && (
              <Link onClick={() => setSubPath('')}>{storageLocations[currentLocation].replace(/\/$/, '')}</Link>
            )}
            {pathSegments.map((segment, index) => (
              <span key={index}>
                {'/'}
                <Link onClick={() => handlePathSegmentClick(index)}>{segment}</Link>
              </span>
            ))}
            {currentFullPath && <CopyOutlined onClick={handleCopyPath} style={{ marginLeft: 8, cursor: 'pointer' }} />}
          </Text>
          {Object.keys(storageLocations).length > 0 && (
            <Select
              value={currentLocation}
              style={{ minWidth: 200 }}
              onChange={handleLocationChange}
              placeholder='Select Location'
            >
              {Object.entries(storageLocations).map(
                (
                  [name, _path] // Changed path to _path to avoid conflict
                ) => (
                  <Option key={name} value={name}>
                    {name}
                  </Option>
                )
              )}
            </Select>
          )}
        </Space>

        <Table
          style={{ maxHeight: 'calc(100vh - 30rem)' }}
          scroll={{ y: 'calc(100vh - 37rem)' }}
          dataSource={files}
          columns={resizableColumns}
          components={components}
          rowKey='name'
          size='small'
          pagination={{ position: ['bottomCenter'], showSizeChanger: true }}
        />

        <Modal
          open={previewOpen}
          onCancel={() => setPreviewOpen(false)}
          footer={null}
          width='70%'
          title={
            <Space direction='vertical' size={2} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 14 }}>
                {previewFile?.name}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                <span
                  style={{ userSelect: 'all', cursor: ctrlPressed ? 'pointer' : 'text' }}
                  onClick={e => {
                    if (e.ctrlKey || e.metaKey) {
                      const path = (previewFile?.path || '').replace(/^s3a:\/\//, 's3://')
                      window.open(`https://data-workbench.dc.shlab.tech/s3?path=${encodeURIComponent(path)}`, '_blank')
                    }
                  }}
                  onDoubleClick={e => {
                    const sel = window.getSelection()
                    const range = document.createRange()
                    range.selectNodeContents(e.currentTarget)
                    sel.addRange(range)
                  }}
                  title='Ctrl + Click to open in data workbench'
                >
                  {(previewFile?.path || '').replace(/^s3a:\/\//, 's3://')}
                </span>
                {previewFile ? ` · ${formatFileSize(previewFile.size)}` : ''}
              </Text>
            </Space>
          }
        >
          <Spin spinning={previewLoading}>
            {previewContent ? (
              <Space direction='vertical' style={{ width: '100%' }}>
                {previewTruncated && (
                  <Text type='warning' style={{ fontSize: 12 }}>
                    Preview limited to {formatFileSize(MAX_PREVIEW_BYTES)}; file is larger.
                  </Text>
                )}
                <div
                  style={{
                    maxHeight: '60vh',
                    overflow: 'auto',
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    padding: 12,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}
                >
                  {previewContent}
                </div>
                <Button icon={<CopyOutlined />} onClick={handleCopyContent} size='small'>
                  Copy content
                </Button>
              </Space>
            ) : (
              !previewLoading && <Text type='secondary'>No content</Text>
            )}
          </Spin>
        </Modal>

        <FileBinaryPreviewModal
          open={binaryPreviewOpen}
          onClose={() => setBinaryPreviewOpen(false)}
          file={binaryPreviewFile}
          metalake={metalake}
          catalog={catalog}
          schema={schema}
          fileset={fileset}
          subPath={binaryPreviewFile?.path}
          locationName={currentLocation}
        />
      </Space>
    </Spin>
  )
}

export default ListFiles
