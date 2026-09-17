/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache.gravitino.rel;

import org.apache.gravitino.NameIdentifier;
import org.apache.gravitino.annotation.Evolving;

/** Interface for relational catalogs that can return a bounded table data sample. */
@Evolving
public interface SupportsTableDataPreview {

  /**
   * Reads at most {@code limit} rows from a table.
   *
   * @param tableIdent identifier of the table
   * @param limit maximum number of rows to return
   * @return sampled columns and rows
   */
  TableDataPreview previewTable(NameIdentifier tableIdent, int limit);
}
