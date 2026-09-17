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
package org.apache.gravitino.catalog.jdbc;

import com.google.common.collect.Maps;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import javax.sql.DataSource;
import org.apache.commons.dbcp2.BasicDataSource;
import org.apache.commons.lang3.reflect.FieldUtils;
import org.apache.gravitino.NameIdentifier;
import org.apache.gravitino.catalog.jdbc.config.JdbcConfig;
import org.apache.gravitino.catalog.jdbc.converter.SqliteColumnDefaultValueConverter;
import org.apache.gravitino.catalog.jdbc.converter.SqliteExceptionConverter;
import org.apache.gravitino.catalog.jdbc.converter.SqliteTypeConverter;
import org.apache.gravitino.catalog.jdbc.operation.SqliteDatabaseOperations;
import org.apache.gravitino.catalog.jdbc.operation.SqliteTableOperations;
import org.apache.gravitino.catalog.jdbc.utils.DataSourceUtils;
import org.apache.gravitino.exceptions.ConnectionFailedException;
import org.apache.gravitino.exceptions.GravitinoRuntimeException;
import org.apache.gravitino.rel.TableDataPreview;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

public class TestJdbcCatalogOperations {

  @Test
  public void testExistingCatalogConnectionFailure() {
    SQLException cause = new SQLException("connection refused");
    SqliteDatabaseOperations databaseOperations =
        new SqliteDatabaseOperations("/unused") {
          @Override
          public List<String> listDatabases() {
            throw new GravitinoRuntimeException(cause, cause.getMessage());
          }
        };

    try (JdbcCatalogOperations catalogOperations =
        new JdbcCatalogOperations(
            new SqliteExceptionConverter(),
            new SqliteTypeConverter(),
            databaseOperations,
            new SqliteTableOperations(),
            new SqliteColumnDefaultValueConverter())) {
      ConnectionFailedException exception =
          Assertions.assertThrows(
              ConnectionFailedException.class,
              () -> catalogOperations.testConnection(NameIdentifier.of("metalake", "catalog")));
      Assertions.assertSame(cause, exception.getCause());
    }
  }

  @Test
  public void testConfigTestOnBorrow() throws SQLException {
    HashMap<String, String> properties = Maps.newHashMap();
    properties.put(JdbcConfig.JDBC_DRIVER.getKey(), "org.sqlite.JDBC");
    properties.put(JdbcConfig.JDBC_URL.getKey(), "jdbc:sqlite::memory:");
    properties.put(JdbcConfig.USERNAME.getKey(), "test");
    properties.put(JdbcConfig.PASSWORD.getKey(), "test");
    properties.put(JdbcConfig.TEST_ON_BORROW.getKey(), "false");

    DataSource dataSource =
        Assertions.assertDoesNotThrow(() -> DataSourceUtils.createDataSource(properties));
    Assertions.assertInstanceOf(BasicDataSource.class, dataSource);
    Assertions.assertFalse(((BasicDataSource) dataSource).getTestOnBorrow());
    ((BasicDataSource) dataSource).close();
  }

  @Test
  public void testPreviewTableReturnsAtMostOneHundredRows(@TempDir Path tempDir) throws Exception {
    HashMap<String, String> properties = Maps.newHashMap();
    properties.put(JdbcConfig.JDBC_DRIVER.getKey(), "org.sqlite.JDBC");
    properties.put(JdbcConfig.JDBC_URL.getKey(), "jdbc:sqlite:" + tempDir.resolve("preview.db"));
    properties.put(JdbcConfig.USERNAME.getKey(), "test");
    properties.put(JdbcConfig.PASSWORD.getKey(), "test");

    BasicDataSource dataSource = (BasicDataSource) DataSourceUtils.createDataSource(properties);
    JdbcCatalogOperations catalogOperations =
        new JdbcCatalogOperations(
            new SqliteExceptionConverter(),
            new SqliteTypeConverter(),
            new SqliteDatabaseOperations(":memory:"),
            new SqliteTableOperations(),
            new SqliteColumnDefaultValueConverter());
    FieldUtils.writeField(catalogOperations, "dataSource", dataSource, true);

    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement()) {
      statement.execute("CREATE TABLE sample (id INTEGER, note TEXT)");
      for (int i = 0; i < 105; i++) {
        statement.execute(
            String.format("INSERT INTO sample VALUES (%d, %s)", i, i == 0 ? "NULL" : "'row'"));
      }

      TableDataPreview preview =
          catalogOperations.previewTable(
              NameIdentifier.of("metalake", "catalog", "main", "sample"), 100);

      Assertions.assertEquals(List.of("id", "note"), preview.columns());
      Assertions.assertEquals(100, preview.rows().size());
      Assertions.assertEquals(Arrays.asList("0", null), preview.rows().get(0));
      Assertions.assertEquals(List.of("99", "row"), preview.rows().get(99));
    } finally {
      catalogOperations.close();
    }
  }

  @Test
  public void testCloseDoesNotThrow() {
    JdbcCatalogOperations catalogOperations =
        new JdbcCatalogOperations(
            new SqliteExceptionConverter(),
            new SqliteTypeConverter(),
            new SqliteDatabaseOperations("/illegal/path"),
            new SqliteTableOperations(),
            new SqliteColumnDefaultValueConverter());

    Assertions.assertDoesNotThrow(catalogOperations::close);
  }
}
