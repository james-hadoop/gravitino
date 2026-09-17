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

package org.apache.gravitino.catalog;

import java.io.IOException;
import org.apache.gravitino.NameIdentifier;
import org.apache.gravitino.exceptions.NoSuchFilesetException;
import org.apache.gravitino.file.FileInfo;

/**
 * The {@code FilesetFileOps} interface defines operations for managing files within filesets. This
 * interface is designed to be used internally by the server and not exposed to public client APIs
 * to avoid confusion.
 */
public interface FilesetFileOps {

  /**
   * List the files in a fileset with a specific location name and sub path.
   *
   * @param ident A fileset identifier.
   * @param locationName The location name. If null, the default location will be used.
   * @param subPath The sub path under the fileset.
   * @return An array of file information objects.
   */
  default FileInfo[] listFiles(NameIdentifier ident, String locationName, String subPath)
      throws NoSuchFilesetException, IOException {
    throw new UnsupportedOperationException(
        "listFiles not supported by " + getClass().getSimpleName());
  }

  /**
   * Read the raw bytes of a file in a fileset with a specific location name and sub path. Reads at
   * most {@code maxLength} bytes from the head of the file.
   *
   * @param ident A fileset identifier.
   * @param locationName The location name. If null, the default location will be used.
   * @param subPath The sub path pointing to a regular file under the fileset.
   * @param maxLength The maximum number of bytes to read.
   * @return The file content bytes.
   */
  default byte[] readFileBytes(
      NameIdentifier ident, String locationName, String subPath, int maxLength)
      throws NoSuchFilesetException, IOException {
    throw new UnsupportedOperationException(
        "readFileBytes not supported by " + getClass().getSimpleName());
  }

  /**
   * Read the text content of a file in a fileset with a specific location name and sub path. Reads
   * at most {@code maxLength} bytes from the head of the file.
   *
   * @param ident A fileset identifier.
   * @param locationName The location name. If null, the default location will be used.
   * @param subPath The sub path pointing to a regular file under the fileset.
   * @param maxLength The maximum number of bytes to read.
   * @return The file content as UTF-8 text.
   */
  default String readFile(NameIdentifier ident, String locationName, String subPath, int maxLength)
      throws NoSuchFilesetException, IOException {
    return new String(
        readFileBytes(ident, locationName, subPath, maxLength),
        java.nio.charset.StandardCharsets.UTF_8);
  }
}
