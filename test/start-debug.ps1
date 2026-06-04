<#
.SYNOPSIS
    HallOfFame 本地调试启动脚本
.DESCRIPTION
    启动所有必需的依赖服务并运行后端和前端开发服务器。
    支持两种模式:
      - Minimal (默认): 仅需要 MongoDB，其他组件使用退化策略
      - Full:        使用 Docker 启动全部基础设施 (MongoDB + PostgreSQL + Redis)
.PARAMETER Mode
    启动模式: "minimal" (默认) 或 "full"
.PARAMETER MongoURI
    MongoDB 连接地址 (默认: mongodb://localhost:27017)
.PARAMETER SkipBackend
    跳过启动后端服务器
.PARAMETER SkipFrontend
    跳过启动前端开发服务器
.EXAMPLE
    # 最小化启动 (仅 MongoDB)
    .\start-debug.ps1

    # 完整启动 (Docker + 后端 + 前端)
    .\start-debug.ps1 -Mode full

    # 仅启动后端
    .\start-debug.ps1 -SkipFrontend
#>

param(
    [ValidateSet("minimal", "full")]
    [string]$Mode = "minimal",

    [string]$MongoURI = "mongodb://localhost:27017",

    [switch]$SkipBackend,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path "$PSScriptRoot/.."

# ============================================================
# 辅助函数
# ============================================================
function Write-Info($msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Cyan
}
function Write-Success($msg) {
    Write-Host "[OK]   $msg" -ForegroundColor Green
}
function Write-Warn($msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}
function Write-Error($msg) {
    Write-Host "[ERR]  $msg" -ForegroundColor Red
}

function Test-PortOpen($hostname, $port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync($hostname, $port).Wait(1000) | Out-Null
        if ($tcp.Connected) { $tcp.Close(); return $true }
        return $false
    } catch {
        return $false
    }
}

function Start-ServiceCheck($name, $hostname, $port) {
    Write-Info "检查 $name ($hostname`:$port)..."
    if (Test-PortOpen $hostname $port) {
        Write-Success "$name 已就绪"
        return $true
    }
    return $false
}

# ============================================================
# 加载 .env 文件 (与脚本同目录)
# ============================================================
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Write-Info "加载环境变量文件: $envFile"
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $eqIndex = $line.IndexOf("=")
            if ($eqIndex -gt 0) {
                $key = $line.Substring(0, $eqIndex).Trim()
                $val = $line.Substring($eqIndex + 1).Trim()
                $val = $val.Trim('"', "'")
                if ($val -ne "") {
                    Set-Item -Path "env:$key" -Value $val -ErrorAction SilentlyContinue
                }
            }
        }
    }
    Write-Success ".env 已加载"
} else {
    Write-Warn "未找到 .env 文件，使用默认配置"
}

if (-not $PSBoundParameters.ContainsKey("MongoURI") -and $env:MONGO_URI) { $MongoURI = $env:MONGO_URI }

# ============================================================
# 标题
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  HallOfFame 本地调试启动脚本" -ForegroundColor Magenta
Write-Host "  模式: $Mode" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# ============================================================
# 环境变量 — 仅补全 .env 中未设置的项
# ============================================================
if (-not $env:MONGO_URI) { $env:MONGO_URI = $MongoURI }
if (-not $env:MONGO_DB) { $env:MONGO_DB = "halloffame_debug" }
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = "debug-secret-do-not-use-in-production" }
if (-not $env:PORT) { $env:PORT = "8888" }
if (-not $env:BOT_PORT) { $env:BOT_PORT = "8889" }
if (-not $env:GITHUB_REDIRECT_URL) { $env:GITHUB_REDIRECT_URL = "http://localhost:8888/api/v1/auth/github/callback" }

# ============================================================
# Full 模式: 用 Docker 启动全部基础设施
# ============================================================
if ($Mode -eq "full") {
    Write-Info "Full 模式: 使用 Docker Compose 启动全部基础设施..."
    $composeFile = "$RootDir/deployments/docker-compose/docker-compose.yaml"

    if (-not (Test-Path $composeFile)) {
        Write-Error "找不到 Docker Compose 文件: $composeFile"
        exit 1
    }

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker 未安装，无法使用 Full 模式"
        exit 1
    }

    Push-Location $RootDir/deployments/docker-compose
    try {
        docker compose -f $composeFile up -d mongo postgres redis minio 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Docker 启动失败"
            exit 1
        }
        Write-Success "Docker 基础设施已启动"
    } finally {
        Pop-Location
    }

    # 补全 .env 中未设置的 Full 模式默认值
    if (-not $env:DB_DRIVER) { $env:DB_DRIVER = "postgres" }
    if (-not $env:POSTGRES_HOST) { $env:POSTGRES_HOST = "localhost" }
    if (-not $env:POSTGRES_PORT) { $env:POSTGRES_PORT = "5432" }
    if (-not $env:POSTGRES_USER) { $env:POSTGRES_USER = "postgres" }
    if (-not $env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD = "postgres" }
    if (-not $env:POSTGRES_DB) { $env:POSTGRES_DB = "halloffame" }
    if (-not $env:REDIS_ADDR) { $env:REDIS_ADDR = "localhost:6379" }

    Start-Sleep -Seconds 3

} else {
    Write-Info "Minimal 模式: 启动 Docker 基础设施中的 MongoDB..."

    $composeFile = "$RootDir/deployments/docker-compose/docker-compose.yaml"
    if ((Test-Path $composeFile) -and (Get-Command docker -ErrorAction SilentlyContinue)) {
        Push-Location $RootDir/deployments/docker-compose
        try {
            docker compose -f $composeFile up -d mongo 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "MongoDB (Docker) 已启动"
            }
        } catch {
            Write-Warn "Docker 启动 MongoDB 失败，假定已有外部 MongoDB"
        } finally {
            Pop-Location
        }
    }

    # 补全 .env 中未设置的最小化默认值
    if (-not $env:DB_DRIVER) { $env:DB_DRIVER = "sqlite" }
    if (-not $env:SQLITE_PATH) { $env:SQLITE_PATH = "$RootDir/data/halloffame_debug.db" }
    if (-not $env:STORAGE_DRIVER) { $env:STORAGE_DRIVER = "local" }
}

# ============================================================
# 检查 MongoDB (两种模式都需要)
# ============================================================
Write-Info "检查 MongoDB 连接..."
$mongoAvailable = $false
try {
    $mongo = New-Object System.Net.Sockets.TcpClient
    $mongo.ConnectAsync("localhost", 27017).Wait(2000) | Out-Null
    if ($mongo.Connected) {
        $mongo.Close()
        $mongoAvailable = $true
        Write-Success "MongoDB 已就绪 (localhost:27017)"
    }
} catch {}
if (-not $mongoAvailable) {
    Write-Warn "MongoDB 未运行在 localhost:27017"
    Write-Info "尝试通过环境变量 MONGO_URI 连接: $MongoURI"
    Write-Warn "请确保 MongoDB 已启动，否则后端将无法运行"
}

# ============================================================
# 启动后端服务器
# ============================================================
if (-not $SkipBackend) {
    Write-Info "编译并启动后端服务器..."

    # 先编译确保无错误
    Push-Location $RootDir
    try {
        $build = go build -o "$RootDir/data/halloffame_debug.exe" ./cmd/halloffame/
        if ($LASTEXITCODE -ne 0) {
            Write-Error "后端编译失败"
            exit 1
        }
        Write-Success "后端编译成功"
    } finally {
        Pop-Location
    }

    # 启动后端
    Write-Info "启动后端服务器 (端口 8888 + Bot 端口 8889)..."
    $backendJob = Start-Job -Name "HallOfFame-Backend" -ScriptBlock {
        param($exe, $envVars, $workDir)
        Set-Location $workDir
        foreach ($kv in $envVars.GetEnumerator()) {
            [Environment]::SetEnvironmentVariable($kv.Key, $kv.Value)
        }
        & $exe -a
    } -ArgumentList @(
        "$RootDir/data/halloffame_debug.exe",
        $env,
        $RootDir
    )

    Start-Sleep -Seconds 2

    # 检查后端是否启动成功
    if (Test-PortOpen "localhost" 8888) {
        Write-Success "后端服务器已启动: http://localhost:8888"
        Write-Success "Bot 服务器已启动: http://localhost:8889"
    } else {
        Write-Warn "后端可能尚未就绪，等待 3 秒..."
        Start-Sleep -Seconds 3
        if (Test-PortOpen "localhost" 8888) {
            Write-Success "后端服务器已启动: http://localhost:8888"
        } else {
            Write-Warn "后端启动状态未知，请检查上方编译输出"
        }
    }
}

# ============================================================
# 启动前端开发服务器
# ============================================================
if (-not $SkipFrontend) {
    # 检查 node_modules
    if (-not (Test-Path "$RootDir/web/node_modules")) {
        Write-Info "安装前端依赖..."
        Push-Location "$RootDir/web"
        try {
            npm install 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Error "前端依赖安装失败"
                exit 1
            }
            Write-Success "前端依赖安装完成"
        } finally {
            Pop-Location
        }
    }

    Write-Info "启动前端开发服务器 (端口 5173)..."
    $frontendJob = Start-Job -Name "HallOfFame-Frontend" -ScriptBlock {
        param($rootDir)
        Set-Location "$rootDir/web"
        npx vite --host 2>&1
    } -ArgumentList $RootDir

    Start-Sleep -Seconds 3

    if (Test-PortOpen "localhost" 5173) {
        Write-Success "前端服务器已启动: http://localhost:5173"
    } else {
        Write-Warn "前端可能尚未就绪，可稍后手动访问 http://localhost:5173"
    }
}

# ============================================================
# 启动摘要
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  HallOfFame 调试环境启动完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  后端 API:      http://localhost:8888" -ForegroundColor White
Write-Host "  Bot API:       http://localhost:8889" -ForegroundColor White
Write-Host "  前端页面:      http://localhost:5173" -ForegroundColor White
Write-Host "  接口文档:      $RootDir/api/openapi.yaml" -ForegroundColor White
Write-Host ""
Write-Host "  模式:          $Mode" -ForegroundColor Cyan
Write-Host "  数据库:        $($env:DB_DRIVER)" -ForegroundColor Cyan
if ($env:REDIS_ADDR) { Write-Host "  缓存:         Redis ($($env:REDIS_ADDR))" -ForegroundColor Cyan } else { Write-Host "  Token 存储:   内存" -ForegroundColor Cyan }
Write-Host ""
Write-Host "  按 Ctrl+C 停止所有服务" -ForegroundColor Red
Write-Host ""

# ============================================================
# 等待并管理后台任务
# ============================================================
try {
    # 保持脚本运行
    while ($true) {
        Start-Sleep -Seconds 5

        # 检查后端状态
        if (-not $SkipBackend) {
            $bj = Get-Job -Name "HallOfFame-Backend" -ErrorAction SilentlyContinue
            if ($bj -and $bj.State -eq "Failed") {
                Write-Error "后端进程异常退出!"
                Receive-Job $bj
                break
            }
        }

        # 检查前端状态
        if (-not $SkipFrontend) {
            $fj = Get-Job -Name "HallOfFame-Frontend" -ErrorAction SilentlyContinue
            if ($fj -and $fj.State -eq "Failed") {
                Write-Error "前端进程异常退出!"
                Receive-Job $fj
                break
            }
        }
    }
} finally {
    # 清理
    Write-Info "正在停止所有服务..."
    if (-not $SkipBackend) {
        Stop-Job -Name "HallOfFame-Backend" -ErrorAction SilentlyContinue
        Remove-Job -Name "HallOfFame-Backend" -ErrorAction SilentlyContinue
    }
    if (-not $SkipFrontend) {
        Stop-Job -Name "HallOfFame-Frontend" -ErrorAction SilentlyContinue
        Remove-Job -Name "HallOfFame-Frontend" -ErrorAction SilentlyContinue
    }
    if ($Mode -eq "full") {
        docker compose -f $composeFile down 2>&1
    }
    Write-Success "所有服务已停止"
}
