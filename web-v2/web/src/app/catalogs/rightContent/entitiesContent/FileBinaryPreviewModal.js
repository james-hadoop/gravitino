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

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'

import { App, Button, Modal, Select, Space, Spin, Typography } from 'antd'

import { formatFileSize } from '@/lib/utils'
import { readFilesetFileRawApi, readFilesetFileOfficePdfApi } from '@/lib/api/filesets'

const { Text } = Typography

const PREVIEWABLE_BINARY = /\.(pdf|epub)$/i
const PREVIEWABLE_OFFICE = /\.(docx?|pptx?|xlsx?)$/i

// image extensions the browser can render (heic/raw depend on browser support)
const PREVIEWABLE_IMAGE = /\.(png|jpe?g|svg|gif|bmp|tiff?|heic|heif|raw|cr2|nef|arw|dng|avif)$/i

/**
 * Decode base64 content into a Uint8Array.
 */
const base64ToBytes = b64 => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i)
  }

  return bytes
}

/**
 * Render a PDF via pdfjs-dist into a stacked canvas container.
 */
const PdfRenderer = ({ bytes, height }) => {
  const containerRef = useRef(null)
  const [rendering, setRendering] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current

    const render = async () => {
      try {
        const pdfjs = await import('pdfjs-dist')

        // Static worker bundle served from public/: copied at build time (see next.config).
        pdfjs.GlobalWorkerOptions.workerSrc = '/ui/pdf.worker.min.mjs?v=4.10.38'

        const doc = await pdfjs.getDocument({ data: bytes }).promise
        const pages = Math.min(doc.numPages, 50)

        for (let pageNum = 1; pageNum <= pages; pageNum += 1) {
          if (cancelled) {
            return
          }
          const page = await doc.getPage(pageNum)
          const viewport = page.getViewport({ scale: 1.35 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.maxWidth = '100%'
          canvas.style.background = '#fff'
          canvas.style.margin = '4px auto'
          canvas.style.display = 'block'
          canvas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)'
          container.appendChild(canvas)
          const ctx = canvas.getContext('2d')
          await page.render({ canvasContext: ctx, viewport }).promise
        }
        if (!cancelled) {
          setRendering(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e.message || e))
          setRendering(false)
        }
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [bytes])

  return (
    <div>
      <div
        ref={containerRef}
        style={{ maxHeight: height, overflow: 'auto', background: '#525659', padding: '8px 0' }}
      />
      {rendering && <Spin style={{ display: 'block', margin: '12px auto' }} />}
      {error && <Text type='danger'>PDF render error: {error}</Text>}
    </div>
  )
}

/**
 * Render an EPUB via epubjs into an embedded viewport.
 */
const EpubRenderer = ({ bytes, height }) => {
  const ref = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let rendition = null
    let cancelled = false

    const render = async () => {
      try {
        const ePub = (await import('epubjs')).default
        const book = ePub(bytes.buffer)
        rendition = book.renderTo(ref.current, { width: '100%', height: '100%' })
        await rendition.display()
      } catch (e) {
        if (!cancelled) {
          setError(String(e.message || e))
        }
      }
    }

    render()

    return () => {
      cancelled = true
      if (rendition && rendition.destroy) {
        rendition.destroy()
      }
    }
  }, [bytes])

  return (
    <div>
      <div ref={ref} style={{ height, background: '#fff' }} />
      {error && <Text type='danger'>EPUB render error: {error}</Text>}
    </div>
  )
}

/**
 * Render an image from raw bytes via a blob URL.
 */
const ImageRenderer = ({ bytes, mime, height }) => {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const blob = new Blob([bytes], { type: mime || 'image/*' })
    const blobUrl = URL.createObjectURL(blob)
    setUrl(blobUrl)

    return () => {
      URL.revokeObjectURL(blobUrl)
    }
  }, [bytes, mime])

  if (failed) {
    return (
      <Text type='warning'>
        The browser cannot render this image format directly (HEIC/RAW need conversion). Please convert it to PNG/JPEG
        first.
      </Text>
    )
  }

  return (
    <div style={{ maxHeight: height, overflow: 'auto', textAlign: 'center', background: '#fafafa' }}>
      {url && (
        <img
          src={url}
          alt={mime || 'image preview'}
          style={{ maxWidth: '100%', margin: '8px auto', display: 'inline-block' }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

/**
 * Modal preview for binary documents in a fileset.
 * PDF / EPUB are streamed raw; office files (doc/docx/ppt/pptx/xls/xlsx) are
 * converted to PDF server-side first.
 */
const FileBinaryPreviewModal = ({ open, onClose, file, metalake, catalog, schema, fileset, subPath, locationName }) => {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [bytes, setBytes] = useState(null)
  const [isPdf, setIsPdf] = useState(false)
  const [isEpub, setIsEpub] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [mobiNotice, setMobiNotice] = useState(false)
  const [isImage, setIsImage] = useState(false)
  const [imageMime, setImageMime] = useState(null)

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

  const ext = useMemo(() => {
    if (!file?.name) return ''
    const dot = file.name.lastIndexOf('.')

    return dot < 0 ? '' : file.name.slice(dot + 1).toLowerCase()
  }, [file])

  useEffect(() => {
    if (!open || !file?.name) {
      return
    }
    let active = true
    setBytes(null)
    setTruncated(false)
    setMobiNotice(ext === 'mobi')
    setIsImage(PREVIEWABLE_IMAGE.test(file?.name || ''))
    setImageMime(null)

    if (ext === 'mobi') {
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const apiArgs = { metalake, catalog, schema, fileset, subPath, locationName }
        const isOffice = PREVIEWABLE_OFFICE.test(file.name)

        const res = isOffice ? await readFilesetFileOfficePdfApi(apiArgs) : await readFilesetFileRawApi(apiArgs)

        if (!active) {
          return
        }
        if (!res || res.code !== 0) {
          throw new Error((res && res.message) || 'Failed to read file')
        }

        const raw = base64ToBytes(res.content)
        setBytes(raw)
        setTruncated(Boolean(res.truncated))
        const mime = res.mimeType || ''
        const effectiveExt = isOffice ? 'pdf' : ext
        setIsPdf(effectiveExt === 'pdf' || mime === 'application/pdf')
        setIsEpub(effectiveExt === 'epub' || mime === 'application/epub+zip')
        setImageMime(mime)
      } catch (e) {
        if (active) {
          message.error(`Failed to preview: ${e.message || e}`)
          onClose()
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [open, file, metalake, catalog, schema, fileset, subPath, locationName, ext, message, onClose])

  const bodyHeight = '62vh'

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width='72%'
      title={
        <Space direction='vertical' size={2} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 14 }}>
            {file?.name}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            <span
              style={{ userSelect: 'all', cursor: ctrlPressed ? 'pointer' : 'text' }}
              onClick={e => {
                if (e.ctrlKey || e.metaKey) {
                  const path = (file?.fullPath || subPath || '').replace(/^s3a:\/\//, 's3://')
                  window.open(`https://data-workbench.dc.shlab.tech/s3?path=${encodeURIComponent(path)}`, '_blank')
                }
              }}
              onDoubleClick={e => {
                const sel = window.getSelection()
                const range = document.createRange()
                range.selectNodeContents(e.currentTarget)
                sel.removeAllRanges()
                sel.addRange(range)
              }}
              title='Ctrl + Click to open in data workbench'
            >
              {(file?.fullPath || subPath || '').replace(/^s3a:\/\//, 's3://')}
            </span>
            {file ? ` · ${formatFileSize(file.size)}` : ''}
            {PREVIEWABLE_OFFICE.test(file?.name || '') ? ' · converted to PDF' : ''}
          </Text>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {mobiNotice && (
          <Text type='warning'>
            MOBI preview is not supported in the browser yet. Please convert it to EPUB/PDF first.
          </Text>
        )}
        {bytes && isImage && !isPdf && !isEpub && <ImageRenderer bytes={bytes} mime={imageMime} height={bodyHeight} />}
        {bytes && isPdf && <PdfRenderer bytes={bytes} height={bodyHeight} />}
        {bytes && isEpub && <EpubRenderer bytes={bytes} height={bodyHeight} />}
        {truncated && (
          <Text type='warning' style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            Preview limited to 64 MB from the file head; the file is larger.
          </Text>
        )}
      </Spin>
    </Modal>
  )
}

export default FileBinaryPreviewModal

export { PREVIEWABLE_BINARY, PREVIEWABLE_OFFICE, PREVIEWABLE_IMAGE }
