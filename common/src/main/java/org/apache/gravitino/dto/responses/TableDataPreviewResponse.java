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
import java.util.List;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;
import org.apache.gravitino.rel.TableDataPreview;

/** Represents a response containing sampled table data. */
@Getter
@ToString
@EqualsAndHashCode(callSuper = true)
public class TableDataPreviewResponse extends BaseResponse {

  @JsonProperty("columns")
  private final List<String> columns;

  @JsonProperty("rows")
  private final List<List<String>> rows;

  /**
   * Creates a table data preview response.
   *
   * @param preview sampled table data
   */
  public TableDataPreviewResponse(TableDataPreview preview) {
    this.columns = preview.columns();
    this.rows = preview.rows();
  }

  /** Constructor used by Jackson deserialization. */
  public TableDataPreviewResponse() {
    this.columns = null;
    this.rows = null;
  }

  @Override
  public void validate() throws IllegalArgumentException {
    super.validate();
    Preconditions.checkArgument(columns != null, "columns must not be null");
    Preconditions.checkArgument(rows != null, "rows must not be null");
  }
}
