use std::fs;
use std::path::PathBuf;

use directories::ProjectDirs;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::models::{Project, ProjectSummary, ProjectsFile};

pub struct StorageService {
    databases_dir: PathBuf,
    projects_file: PathBuf,
}

impl StorageService {
    pub fn new() -> Result<Self> {
        let project_dirs = ProjectDirs::from("com", "joedesigns", "duckbake")
            .ok_or_else(|| AppError::Custom("Could not determine app data directory".into()))?;

        let data_dir = project_dirs.data_dir().to_path_buf();
        let databases_dir = data_dir.join("databases");
        let projects_file = data_dir.join("projects.json");

        // Ensure directories exist
        fs::create_dir_all(&data_dir)?;
        fs::create_dir_all(&databases_dir)?;

        // Initialize projects file if it doesn't exist
        if !projects_file.exists() {
            let empty = ProjectsFile::default();
            let json = serde_json::to_string_pretty(&empty)?;
            fs::write(&projects_file, json)?;
        }

        Ok(StorageService {
            databases_dir,
            projects_file,
        })
    }

    fn read_projects(&self) -> Result<ProjectsFile> {
        let content = fs::read_to_string(&self.projects_file)?;
        let projects: ProjectsFile = serde_json::from_str(&content)?;
        Ok(projects)
    }

    fn write_projects(&self, projects: &ProjectsFile) -> Result<()> {
        let json = serde_json::to_string_pretty(projects)?;
        fs::write(&self.projects_file, json)?;
        Ok(())
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectSummary>> {
        let file = self.read_projects()?;
        Ok(file.projects.iter().map(ProjectSummary::from).collect())
    }

    pub fn create_project(&self, name: String, description: String) -> Result<Project> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let database_file = format!("{}.duckdb", id);

        let project = Project {
            id: id.clone(),
            name,
            description,
            created_at: now.clone(),
            updated_at: now,
            database_file: database_file.clone(),
        };

        // Create the database file path (DuckDB will create it on first connection)
        let db_path = self.databases_dir.join(&database_file);

        // Create an empty DuckDB database
        let conn = duckdb::Connection::open(&db_path)?;

        // Create metadata tables
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS _duckbake_chat_history (
                id VARCHAR PRIMARY KEY,
                role VARCHAR NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                context_tables VARCHAR[]
            );

            CREATE TABLE IF NOT EXISTS _duckbake_query_history (
                id VARCHAR PRIMARY KEY,
                sql_text TEXT NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                row_count INTEGER,
                execution_time_ms INTEGER
            );

            CREATE TABLE IF NOT EXISTS _duckbake_vector_config (
                table_name VARCHAR NOT NULL,
                column_name VARCHAR NOT NULL,
                embedding_model VARCHAR NOT NULL,
                vector_column_name VARCHAR NOT NULL,
                last_updated TIMESTAMP,
                PRIMARY KEY (table_name, column_name)
            );
            "#,
        )?;

        // Add to projects file
        let mut file = self.read_projects()?;
        file.projects.push(project.clone());
        self.write_projects(&file)?;

        Ok(project)
    }

    pub fn get_project(&self, id: &str) -> Result<Project> {
        let file = self.read_projects()?;
        file.projects
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::ProjectNotFound(id.to_string()))
    }

    pub fn delete_project(&self, id: &str) -> Result<()> {
        let mut file = self.read_projects()?;

        // Find and remove the project
        let project = file
            .projects
            .iter()
            .find(|p| p.id == id)
            .cloned()
            .ok_or_else(|| AppError::ProjectNotFound(id.to_string()))?;

        file.projects.retain(|p| p.id != id);
        self.write_projects(&file)?;

        // Delete the database file
        let db_path = self.databases_dir.join(&project.database_file);
        if db_path.exists() {
            fs::remove_file(db_path)?;
        }

        Ok(())
    }

    pub fn update_project(&self, id: &str, name: Option<String>, description: Option<String>) -> Result<Project> {
        let mut file = self.read_projects()?;

        let project = file
            .projects
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::ProjectNotFound(id.to_string()))?;

        if let Some(n) = name {
            project.name = n;
        }
        if let Some(d) = description {
            project.description = d;
        }
        project.updated_at = chrono::Utc::now().to_rfc3339();

        let updated = project.clone();
        self.write_projects(&file)?;

        Ok(updated)
    }

    pub fn get_database_path(&self, project: &Project) -> PathBuf {
        self.databases_dir.join(&project.database_file)
    }
}
