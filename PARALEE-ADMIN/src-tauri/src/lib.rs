use log::info;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn enable_auto_start(app_handle: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .to_string();
        
        let reg_key = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER)
            .open_subkey_with_flags(
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                winreg::enums::KEY_WRITE,
            )
            .map_err(|e| e.to_string())?;
        
        reg_key.set_value("ParaleeAdmin", &exe_path)
            .map_err(|e| e.to_string())?;
        
        info!("Auto-start enabled: {}", exe_path);
        Ok(true)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Auto-start only supported on Windows".to_string())
    }
}

#[tauri::command]
async fn disable_auto_start() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let reg_key = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER)
            .open_subkey_with_flags(
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                winreg::enums::KEY_WRITE,
            )
            .map_err(|e| e.to_string())?;
        
        let _ = reg_key.delete_value("ParaleeAdmin");
        
        info!("Auto-start disabled");
        Ok(true)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Auto-start only supported on Windows".to_string())
    }
}

#[tauri::command]
async fn is_auto_start_enabled() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let reg_key = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER)
            .open_subkey_with_flags(
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                winreg::enums::KEY_READ,
            );
        
        match reg_key {
            Ok(key) => Ok(key.get_value::<String, _>("ParaleeAdmin").is_ok()),
            Err(_) => Ok(false),
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[tauri::command]
async fn convert_to_epub(
    app_handle: tauri::AppHandle,
    input_path: String,
    output_path: String,
    title: Option<String>,
    author: Option<String>,
    cover_path: Option<String>,
) -> Result<String, String> {
    let shell = app_handle.shell();
    
    let mut args = vec![input_path.clone(), output_path.clone()];
    
    if let Some(t) = &title {
        args.push(format!("--title={}", t));
    }
    if let Some(a) = &author {
        args.push(format!("--authors={}", a));
    }
    if let Some(cover) = &cover_path {
        args.push(format!("--cover={}", cover));
    }
    
    args.extend_from_slice(&[
        "--output-profile=kindle".to_string(),
        "--language=en".to_string(),
        "--no-default-epub-cover".to_string(),
        "--pretty-print".to_string(),
    ]);
    
    let output = shell
        .command("ebook-convert")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to execute: {}", e))?;

    if output.status.success() {
        Ok(output_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
async fn check_calibre() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "where", "ebook-convert"])
            .output()
            .map(|o| o.status.success())
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("which")
            .arg("ebook-convert")
            .output()
            .map(|o| o.status.success())
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn install_calibre(app_handle: tauri::AppHandle) -> Result<String, String> {
    let shell = app_handle.shell();

    #[cfg(target_os = "windows")]
    {
        let script = r#"
            $workdir = "$env:TEMP\paralee_calibre_install"
            $installer_url = "https://calibre-ebook.com/dist/win64"
            
            try {
                if (-not (Test-Path -Path $workdir)) {
                    New-Item -ItemType Directory -Path $workdir | Out-Null
                }

                Write-Host "Downloading Calibre..."
                $ProgressPreference = 'SilentlyContinue'
                Invoke-WebRequest -Uri $installer_url -OutFile "$workdir\calibre.msi"

                Write-Host "Installing Calibre (this may take a few minutes)..."
                $install_args = "/i `"$workdir\calibre.msi`" /passive /norestart"
                $process = Start-Process msiexec.exe -ArgumentList $install_args -Wait -PassThru

                if ($process.ExitCode -ne 0) {
                    throw "Installation failed with exit code $($process.ExitCode)"
                }

                Remove-Item "$workdir\calibre.msi" -Force -ErrorAction SilentlyContinue
                Write-Output "Calibre installed successfully"
            }
            catch {
                Write-Error $_
                exit 1
            }
        "#;

        let output = shell
            .command("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script])
            .output()
            .await
            .map_err(|e| format!("Failed to execute installer: {}", e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // For macOS/Linux, provide manual instructions
        Err("Please install Calibre manually: https://calibre-ebook.com/download".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    info!("Starting Paralee Admin application...");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            convert_to_epub,
            check_calibre,
            install_calibre,
            enable_auto_start,
            disable_auto_start,
            is_auto_start_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}