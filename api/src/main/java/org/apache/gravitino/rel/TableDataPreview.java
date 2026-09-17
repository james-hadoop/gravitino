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

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.gravitino.annotation.Evolving;

/** A bounded sample of rows from a relational table. */
@Evolving
public final class TableDataPreview {
  private final List<String> columns;
  private final List<List<String>> rows;

  /**
   * Creates a table data preview.
   *
   * @param columns column labels in result order
   * @param rows row values in column order; SQL null values remain null
   */
  public TableDataPreview(List<String> columns, List<List<String>> rows) {
    this.columns = Collections.unmodifiableList(new ArrayList<>(columns));
    this.rows =
        Collections.unmodifiableList(
            rows.stream()
                .map(row -> Collections.unmodifiableList(new ArrayList<>(row)))
                .collect(Collectors.toList()));
  }

  /**
   * @return column labels in result order
   */
  public List<String> columns() {
    return columns;
  }

  /**
   * @return sampled rows in column order
   */
  public List<List<String>> rows() {
    return rows;
  }
}
