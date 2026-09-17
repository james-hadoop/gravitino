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

/** Response for reading text content of a file in a fileset. */
@Getter
@ToString
@EqualsAndHashCode(callSuper = true)
public class FileContentResponse extends BaseResponse {

  @JsonProperty("content")
  private final String content;

  @JsonProperty("length")
  private final long length;

  /** Constructor for FileContentResponse. */
  public FileContentResponse() {
    super(0);
    this.content = null;
    this.length = 0;
  }

  /**
   * Constructor for FileContentResponse.
   *
   * @param content The file content as UTF-8 text.
   * @param length The number of characters returned.
   */
  public FileContentResponse(String content, long length) {
    super(0);
    this.content = content;
    this.length = length;
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
    Preconditions.checkArgument(length >= 0, "length must be >= 0");
  }
}
