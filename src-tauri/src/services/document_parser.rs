use std::fs;
use std::io::Read;
use std::path::Path;

use pulldown_cmark::{Event, HeadingLevel, Parser, Tag, TagEnd};

use crate::error::{AppError, Result};
use crate::models::{DocumentChunk, DocumentMetadata, HeadingInfo};

pub struct DocumentParser;

impl DocumentParser {
    /// Detect document file type from extension
    pub fn detect_file_type(file_path: &str) -> Result<String> {
        let path = Path::new(file_path);
        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .ok_or_else(|| AppError::Custom("Could not determine file type".into()))?;

        match extension.as_str() {
            "txt" => Ok("txt".into()),
            "md" | "markdown" => Ok("md".into()),
            "docx" => Ok("docx".into()),
            "pdf" => Ok("pdf".into()),
            _ => Err(AppError::Custom(format!(
                "Unsupported document type: {}. Supported types: txt, md, docx, pdf",
                extension
            ))),
        }
    }

    /// Get supported document extensions
    pub fn get_supported_extensions() -> Vec<String> {
        vec![
            "txt".into(),
            "md".into(),
            "markdown".into(),
            "docx".into(),
            "pdf".into(),
        ]
    }

    /// Parse document and extract content and metadata
    pub fn parse_document(file_path: &str) -> Result<(String, DocumentMetadata)> {
        let file_type = Self::detect_file_type(file_path)?;
        let file_size = fs::metadata(file_path).map_err(|e| {
            AppError::Custom(format!("Cannot access file '{}': {}", file_path, e))
        })?.len() as i64;
        let filename = Path::new(file_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        match file_type.as_str() {
            "txt" => Self::parse_txt(file_path, filename, file_size),
            "md" => Self::parse_markdown(file_path, filename, file_size),
            "docx" => Self::parse_docx(file_path, filename, file_size),
            "pdf" => Self::parse_pdf(file_path, filename, file_size),
            _ => Err(AppError::Custom(format!(
                "Unsupported file type: {}",
                file_type
            ))),
        }
    }

    /// Parse plain text file
    fn parse_txt(path: &str, filename: String, file_size: i64) -> Result<(String, DocumentMetadata)> {
        let content = fs::read_to_string(path).map_err(|e| {
            AppError::Custom(format!("Failed to read '{}': {}. Ensure the file is UTF-8 encoded.", filename, e))
        })?;

        let word_count = content.split_whitespace().count() as i32;

        Ok((
            content,
            DocumentMetadata {
                filename,
                file_type: "txt".into(),
                file_size,
                page_count: None,
                word_count,
                title: None,
                author: None,
                creation_date: None,
                headings: vec![],
            },
        ))
    }

    /// Parse markdown file with heading extraction
    fn parse_markdown(
        path: &str,
        filename: String,
        file_size: i64,
    ) -> Result<(String, DocumentMetadata)> {
        let content = fs::read_to_string(path).map_err(|e| {
            AppError::Custom(format!("Failed to read '{}': {}. Ensure the file is UTF-8 encoded.", filename, e))
        })?;

        let word_count = content.split_whitespace().count() as i32;

        // Extract headings using pulldown-cmark
        let mut headings = Vec::new();
        let parser = Parser::new(&content);

        let mut current_heading_level: Option<i32> = None;
        let mut current_heading_text = String::new();
        let mut offset = 0i32;

        for event in parser {
            match event {
                Event::Start(Tag::Heading { level, .. }) => {
                    current_heading_level = Some(match level {
                        HeadingLevel::H1 => 1,
                        HeadingLevel::H2 => 2,
                        HeadingLevel::H3 => 3,
                        HeadingLevel::H4 => 4,
                        HeadingLevel::H5 => 5,
                        HeadingLevel::H6 => 6,
                    });
                    current_heading_text.clear();
                }
                Event::Text(text) => {
                    if current_heading_level.is_some() {
                        current_heading_text.push_str(&text);
                    }
                }
                Event::End(TagEnd::Heading(_)) => {
                    if let Some(level) = current_heading_level.take() {
                        headings.push(HeadingInfo {
                            level,
                            text: current_heading_text.clone(),
                            offset,
                        });
                        offset += 1;
                    }
                }
                _ => {}
            }
        }

        // Extract title from first H1 heading
        let title = headings
            .iter()
            .find(|h| h.level == 1)
            .map(|h| h.text.clone());

        Ok((
            content,
            DocumentMetadata {
                filename,
                file_type: "md".into(),
                file_size,
                page_count: None,
                word_count,
                title,
                author: None,
                creation_date: None,
                headings,
            },
        ))
    }

    /// Parse DOCX file
    fn parse_docx(
        path: &str,
        filename: String,
        file_size: i64,
    ) -> Result<(String, DocumentMetadata)> {
        let file = fs::File::open(path).map_err(|e| {
            AppError::Custom(format!("Failed to open DOCX file: {}", e))
        })?;

        let mut archive = zip::ZipArchive::new(file).map_err(|e| {
            AppError::Custom(format!("Failed to read DOCX archive: {}", e))
        })?;

        // Extract text from document.xml
        let content = Self::extract_docx_text(&mut archive)?;
        let word_count = content.split_whitespace().count() as i32;

        // Extract metadata from docProps/core.xml
        let (title, author, creation_date) = Self::extract_docx_metadata(&mut archive);

        Ok((
            content,
            DocumentMetadata {
                filename,
                file_type: "docx".into(),
                file_size,
                page_count: None,
                word_count,
                title,
                author,
                creation_date,
                headings: vec![],
            },
        ))
    }

    /// Extract text content from DOCX document.xml
    fn extract_docx_text(archive: &mut zip::ZipArchive<fs::File>) -> Result<String> {
        let mut doc_xml = archive.by_name("word/document.xml").map_err(|e| {
            AppError::Custom(format!("Failed to find document.xml in DOCX: {}", e))
        })?;

        let mut xml_content = String::new();
        doc_xml.read_to_string(&mut xml_content).map_err(|e| {
            AppError::Custom(format!("Failed to read document.xml: {}", e))
        })?;

        // Parse XML and extract text from <w:t> elements
        let mut text_content = String::new();
        let mut in_text_element = false;
        let mut in_paragraph = false;

        let reader = quick_xml::Reader::from_str(&xml_content);
        let mut reader = reader;
        reader.config_mut().trim_text(false);

        let mut buf = Vec::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(quick_xml::events::Event::Start(ref e)) => {
                    let name = e.name();
                    let local_name = name.local_name();
                    if local_name.as_ref() == b"t" {
                        in_text_element = true;
                    } else if local_name.as_ref() == b"p" {
                        in_paragraph = true;
                    }
                }
                Ok(quick_xml::events::Event::End(ref e)) => {
                    let name = e.name();
                    let local_name = name.local_name();
                    if local_name.as_ref() == b"t" {
                        in_text_element = false;
                    } else if local_name.as_ref() == b"p" {
                        if in_paragraph && !text_content.ends_with('\n') {
                            text_content.push('\n');
                        }
                        in_paragraph = false;
                    }
                }
                Ok(quick_xml::events::Event::Text(e)) => {
                    if in_text_element {
                        if let Ok(text) = e.unescape() {
                            text_content.push_str(&text);
                        }
                    }
                }
                Ok(quick_xml::events::Event::Eof) => break,
                Err(e) => {
                    return Err(AppError::Custom(format!("XML parsing error: {}", e)));
                }
                _ => {}
            }
            buf.clear();
        }

        Ok(text_content.trim().to_string())
    }

    /// Extract metadata from DOCX docProps/core.xml
    fn extract_docx_metadata(
        archive: &mut zip::ZipArchive<fs::File>,
    ) -> (Option<String>, Option<String>, Option<String>) {
        let core_xml = match archive.by_name("docProps/core.xml") {
            Ok(mut file) => {
                let mut content = String::new();
                if file.read_to_string(&mut content).is_ok() {
                    Some(content)
                } else {
                    None
                }
            }
            Err(_) => None,
        };

        let Some(xml_content) = core_xml else {
            return (None, None, None);
        };

        let mut title = None;
        let mut author = None;
        let mut creation_date = None;

        let reader = quick_xml::Reader::from_str(&xml_content);
        let mut reader = reader;
        let mut buf = Vec::new();
        let mut current_element = String::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(quick_xml::events::Event::Start(ref e)) => {
                    let name = e.name();
                    current_element = String::from_utf8_lossy(name.local_name().as_ref()).to_string();
                }
                Ok(quick_xml::events::Event::Text(e)) => {
                    if let Ok(text) = e.unescape() {
                        let text = text.trim().to_string();
                        if !text.is_empty() {
                            match current_element.as_str() {
                                "title" => title = Some(text),
                                "creator" => author = Some(text),
                                "created" => creation_date = Some(text),
                                _ => {}
                            }
                        }
                    }
                }
                Ok(quick_xml::events::Event::Eof) => break,
                Err(_) => break,
                _ => {}
            }
            buf.clear();
        }

        (title, author, creation_date)
    }

    /// Parse PDF file
    fn parse_pdf(
        path: &str,
        filename: String,
        file_size: i64,
    ) -> Result<(String, DocumentMetadata)> {
        // Extract text using pdf-extract
        let content = pdf_extract::extract_text(path).map_err(|e| {
            AppError::Custom(format!("Failed to extract text from PDF: {}", e))
        })?;

        let word_count = content.split_whitespace().count() as i32;

        // Extract metadata using lopdf
        let (page_count, title, author, creation_date) = Self::extract_pdf_metadata(path);

        Ok((
            content,
            DocumentMetadata {
                filename,
                file_type: "pdf".into(),
                file_size,
                page_count,
                word_count,
                title,
                author,
                creation_date,
                headings: vec![],
            },
        ))
    }

    /// Extract metadata from PDF using lopdf
    fn extract_pdf_metadata(
        path: &str,
    ) -> (Option<i32>, Option<String>, Option<String>, Option<String>) {
        let doc = match lopdf::Document::load(path) {
            Ok(d) => d,
            Err(_) => return (None, None, None, None),
        };

        let page_count = Some(doc.get_pages().len() as i32);

        // Try to get document info dictionary
        let (title, author, creation_date) = if let Ok(info_ref) = doc.trailer.get(b"Info") {
            if let Ok(info_ref) = info_ref.as_reference() {
                if let Ok(info) = doc.get_dictionary(info_ref) {
                    let title = info
                        .get(b"Title")
                        .ok()
                        .and_then(|v| v.as_string().ok())
                        .map(|s| s.to_string());

                    let author = info
                        .get(b"Author")
                        .ok()
                        .and_then(|v| v.as_string().ok())
                        .map(|s| s.to_string());

                    let creation_date = info
                        .get(b"CreationDate")
                        .ok()
                        .and_then(|v| v.as_string().ok())
                        .map(|s| s.to_string());

                    (title, author, creation_date)
                } else {
                    (None, None, None)
                }
            } else {
                (None, None, None)
            }
        } else {
            (None, None, None)
        };

        (page_count, title, author, creation_date)
    }

    /// Split document into semantic chunks for vectorization
    pub fn chunk_document(document_id: &str, content: &str, file_type: &str) -> Vec<DocumentChunk> {
        match file_type {
            "md" => Self::chunk_markdown(document_id, content),
            _ => Self::chunk_by_paragraphs(document_id, content),
        }
    }

    /// Chunk content by paragraphs with size limits
    fn chunk_by_paragraphs(document_id: &str, content: &str) -> Vec<DocumentChunk> {
        let mut chunks = Vec::new();
        let paragraphs: Vec<&str> = content.split("\n\n").collect();

        let mut current_chunk = String::new();
        let mut chunk_index = 0;
        let mut char_offset = 0i32;
        let mut chunk_start = 0i32;

        const MAX_CHUNK_SIZE: usize = 1000;
        const MIN_CHUNK_SIZE: usize = 100;

        for para in paragraphs {
            let para = para.trim();
            if para.is_empty() {
                char_offset += 2; // Account for \n\n
                continue;
            }

            // If adding this paragraph would exceed max size, save current chunk
            if !current_chunk.is_empty()
                && current_chunk.len() + para.len() + 2 > MAX_CHUNK_SIZE
            {
                chunks.push(DocumentChunk {
                    id: uuid::Uuid::new_v4().to_string(),
                    document_id: document_id.to_string(),
                    chunk_index,
                    chunk_type: "paragraph".to_string(),
                    content: current_chunk.clone(),
                    start_offset: chunk_start,
                    end_offset: char_offset,
                });
                chunk_index += 1;
                chunk_start = char_offset;
                current_chunk.clear();
            }

            // Add paragraph to current chunk
            if !current_chunk.is_empty() {
                current_chunk.push_str("\n\n");
            }
            current_chunk.push_str(para);
            char_offset += para.len() as i32 + 2;
        }

        // Save final chunk if it meets minimum size
        if !current_chunk.is_empty() && current_chunk.len() >= MIN_CHUNK_SIZE {
            chunks.push(DocumentChunk {
                id: uuid::Uuid::new_v4().to_string(),
                document_id: document_id.to_string(),
                chunk_index,
                chunk_type: "paragraph".to_string(),
                content: current_chunk,
                start_offset: chunk_start,
                end_offset: char_offset,
            });
        } else if !current_chunk.is_empty() && !chunks.is_empty() {
            // Append to previous chunk if too small
            if let Some(last) = chunks.last_mut() {
                last.content.push_str("\n\n");
                last.content.push_str(&current_chunk);
                last.end_offset = char_offset;
            }
        } else if !current_chunk.is_empty() {
            // First and only chunk, keep it regardless of size
            chunks.push(DocumentChunk {
                id: uuid::Uuid::new_v4().to_string(),
                document_id: document_id.to_string(),
                chunk_index,
                chunk_type: "paragraph".to_string(),
                content: current_chunk,
                start_offset: chunk_start,
                end_offset: char_offset,
            });
        }

        chunks
    }

    /// Chunk markdown by sections (headings)
    fn chunk_markdown(document_id: &str, content: &str) -> Vec<DocumentChunk> {
        let mut chunks = Vec::new();
        let lines: Vec<&str> = content.lines().collect();

        let mut current_chunk = String::new();
        let mut chunk_index = 0;
        let mut chunk_start = 0i32;
        let mut char_offset = 0i32;

        const MAX_CHUNK_SIZE: usize = 1000;

        for line in lines {
            let is_heading = line.starts_with('#');

            // If this is a heading and we have content, save current chunk
            if is_heading && !current_chunk.trim().is_empty() {
                chunks.push(DocumentChunk {
                    id: uuid::Uuid::new_v4().to_string(),
                    document_id: document_id.to_string(),
                    chunk_index,
                    chunk_type: "section".to_string(),
                    content: current_chunk.trim().to_string(),
                    start_offset: chunk_start,
                    end_offset: char_offset,
                });
                chunk_index += 1;
                chunk_start = char_offset;
                current_chunk.clear();
            }

            // Check if adding this line would exceed max size
            if !current_chunk.is_empty()
                && current_chunk.len() + line.len() + 1 > MAX_CHUNK_SIZE
                && !is_heading
            {
                chunks.push(DocumentChunk {
                    id: uuid::Uuid::new_v4().to_string(),
                    document_id: document_id.to_string(),
                    chunk_index,
                    chunk_type: "section".to_string(),
                    content: current_chunk.trim().to_string(),
                    start_offset: chunk_start,
                    end_offset: char_offset,
                });
                chunk_index += 1;
                chunk_start = char_offset;
                current_chunk.clear();
            }

            if !current_chunk.is_empty() {
                current_chunk.push('\n');
            }
            current_chunk.push_str(line);
            char_offset += line.len() as i32 + 1;
        }

        // Save final chunk
        if !current_chunk.trim().is_empty() {
            chunks.push(DocumentChunk {
                id: uuid::Uuid::new_v4().to_string(),
                document_id: document_id.to_string(),
                chunk_index,
                chunk_type: "section".to_string(),
                content: current_chunk.trim().to_string(),
                start_offset: chunk_start,
                end_offset: char_offset,
            });
        }

        // If no chunks were created, treat as single chunk
        if chunks.is_empty() && !content.trim().is_empty() {
            chunks.push(DocumentChunk {
                id: uuid::Uuid::new_v4().to_string(),
                document_id: document_id.to_string(),
                chunk_index: 0,
                chunk_type: "section".to_string(),
                content: content.trim().to_string(),
                start_offset: 0,
                end_offset: content.len() as i32,
            });
        }

        chunks
    }
}
