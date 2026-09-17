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
package org.apache.gravitino.dto.responses;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/**
 * Response for reading binary file content in a fileset. The bytes are base64-encoded because
 * Gravitino's REST versioning filter forces JSON content negotiation for all API responses.
 */
@Getter
@ToString
@EqualsAndHashCode(callSuper = true)
public class FileBinaryResponse extends BaseResponse {

  @JsonProperty("content")
  private final String content;

  @JsonProperty("mimeType")
  private final String mimeType;

  @JsonProperty("size")
  private final long size;

  @JsonProperty("truncated")
  private final boolean truncated;

  /** Constructor for FileBinaryResponse. */
  public FileBinaryResponse() {
    super(0);
    this.content = null;
    this.mimeType = null;
    this.size = 0;
    this.truncated = false;
  }

  /**
   * Constructor for FileBinaryResponse.
   *
   * @param content The base64-encoded file content.
   * @param mimeType The MIME type of the file.
   * @param size The number of bytes returned.
   * @param truncated Whether the content was cut at the server-side read cap.
   */
  public FileBinaryResponse(String content, String mimeType, long size, boolean truncated) {
    super(0);
    this.content = content;
    this.mimeType = mimeType;
    this.size = size;
    this.truncated = truncated;
  }

  /**
   * Validates the response.
   *
   * @throws IllegalArgumentException if the response is invalid.
   */
  @Override
  public void validate() throws IllegalArgumentException {
    super.validate();

    Preconditions.checkArgument(content != null, "content must not be null");
    Preconditions.checkArgument(size >= 0, "size must be >= 0");
  }
}
