import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Image, Music, Video, Archive, Code, 
  Book, Map, Box, Table, Download, Eye, Copy,
  Check, AlertCircle, Loader2, File
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useApp } from '../context/AppContext';

// File type detection
export const detectFileType = (file) => {
  const name = file.name?.toLowerCase() || '';
  const mimeType = file.mimeType?.toLowerCase() || '';
  
  // Image types
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];
  if (imageTypes.includes(mimeType) || name.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)$/i)) {
    return { category: 'image', type: 'image' };
  }
  
  // PDF
  if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
    return { category: 'pdf', type: 'pdf' };
  }
  
  // Office documents
  const officeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
  ];
  if (officeTypes.includes(mimeType)) {
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || mimeType.includes('spreadsheet')) {
      return { category: 'spreadsheet', type: 'excel' };
    }
    if (name.endsWith('.pptx') || name.endsWith('.ppt') || mimeType.includes('presentation')) {
      return { category: 'presentation', type: 'powerpoint' };
    }
    return { category: 'document', type: 'word' };
  }
  
  // Google Docs
  if (mimeType.includes('google-apps')) {
    return { category: 'google', type: mimeType.split('.').pop() };
  }
  
  // CAD files
  if (name.endsWith('.dwg') || name.endsWith('.dxf')) {
    return { category: 'cad', type: name.endsWith('.dwg') ? 'dwg' : 'dxf' };
  }
  
  // GIS files
  if (name.endsWith('.shp') || name.endsWith('.geojson') || name.endsWith('.kml') || name.endsWith('.kmz') || mimeType.includes('geojson') || mimeType.includes('kml')) {
    if (name.endsWith('.shp')) return { category: 'gis', type: 'shapefile' };
    if (name.endsWith('.geojson') || mimeType.includes('geojson')) return { category: 'gis', type: 'geojson' };
    if (name.endsWith('.kmz')) return { category: 'gis', type: 'kmz' };
    return { category: 'gis', type: 'kml' };
  }
  
  // 3D models
  if (name.endsWith('.obj') || name.endsWith('.stl') || name.endsWith('.gltf') || name.endsWith('.glb') || name.endsWith('.fbx')) {
    if (name.endsWith('.obj')) return { category: '3d', type: 'obj' };
    if (name.endsWith('.stl')) return { category: '3d', type: 'stl' };
    return { category: '3d', type: 'gltf' };
  }
  
  // Audio files
  const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp3', 'audio/flac'];
  if (audioTypes.includes(mimeType) || name.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i)) {
    return { category: 'audio', type: 'audio' };
  }
  
  // Video files
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
  if (videoTypes.includes(mimeType) || name.match(/\.(mp4|webm|mov|avi|mkv|wmv)$/i)) {
    return { category: 'video', type: 'video' };
  }
  
  // Archive files
  if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz') || name.endsWith('.tar.gz')) {
    if (name.endsWith('.rar')) return { category: 'archive', type: 'rar' };
    if (name.endsWith('.7z')) return { category: 'archive', type: '7z' };
    return { category: 'archive', type: 'zip' };
  }
  
  // Source code files
  if (name.match(/\.(js|ts|py|html|css|jsx|tsx|java|c|cpp|h|hpp|rb|go|rs|php|swift|kt|json|yaml|yml|xml)$/i)) {
    const ext = name.split('.').pop().toLowerCase();
    return { category: 'code', type: ext };
  }
  
  // Markdown
  if (name.endsWith('.md') || name.endsWith('.markdown')) {
    return { category: 'markdown', type: 'markdown' };
  }
  
  // CSV
  if (name.endsWith('.csv') || mimeType === 'text/csv') {
    return { category: 'csv', type: 'csv' };
  }
  
  // eBooks
  if (name.endsWith('.epub') || name.endsWith('.mobi') || name.endsWith('.azw') || name.endsWith('.azw3')) {
    if (name.endsWith('.mobi') || name.endsWith('.azw')) return { category: 'ebook', type: 'mobi' };
    return { category: 'ebook', type: 'epub' };
  }
  
  // Text files
  if (mimeType.startsWith('text/') || name.endsWith('.txt')) {
    return { category: 'text', type: 'text' };
  }
  
  return { category: 'unknown', type: 'unknown' };
};

// Get file icon based on type
export const getFileIcon = (file) => {
  const { category } = detectFileType(file);
  
  const icons = {
    pdf: '📕',
    image: '🖼️',
    document: '📝',
    spreadsheet: '📊',
    presentation: '🌅',
    google: '📄',
    cad: '📐',
    gis: '🗺️',
    '3d': '🎲',
    audio: '🎵',
    video: '🎬',
    archive: '📦',
    code: '💻',
    markdown: '📋',
    csv: '📈',
    ebook: '📚',
    text: '📃',
    unknown: '📄',
  };
  
  return icons[category] || '📄';
};

// Image Preview Component
const ImagePreview = ({ file, url }) => {
  return (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <img 
        src={url} 
        alt={file.name}
        className="max-w-full max-h-full object-contain"
        loading="lazy"
      />
    </div>
  );
};

// Audio Preview Component
const AudioPreview = ({ file, url }) => {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center">
        <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Music className="w-12 h-12 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{file.name}</h3>
        <audio controls className="w-full max-w-md">
          <source src={url} type={file.mimeType} />
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
};

// Video Preview Component
const VideoPreview = ({ file, url }) => {
  return (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <video controls className="max-w-full max-h-full">
        <source src={url} type={file.mimeType} />
        Your browser does not support the video element.
      </video>
    </div>
  );
};

// Code Preview Component with Syntax Highlighting
const CodePreview = ({ file, content }) => {
  const [copied, setCopied] = useState(false);
  
  const getLanguageLabel = (type) => {
    const labels = {
      js: 'JavaScript',
      ts: 'TypeScript',
      py: 'Python',
      html: 'HTML',
      css: 'CSS',
      jsx: 'JSX',
      tsx: 'TSX',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      h: 'C Header',
      rb: 'Ruby',
      go: 'Go',
      rs: 'Rust',
      php: 'PHP',
      swift: 'Swift',
      kt: 'Kotlin',
      json: 'JSON',
      yaml: 'YAML',
      xml: 'XML',
    };
    return labels[type] || type.toUpperCase();
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">{file.name}</span>
          <Badge variant="outline" className="text-xs">{getLanguageLabel(detectFileType(file).type)}</Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={handleCopy} className="text-gray-400 hover:text-white">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <pre className="flex-1 overflow-auto p-4">
        <code className="text-sm text-gray-300 font-mono whitespace-pre">{content}</code>
      </pre>
    </div>
  );
};

// CSV Preview Component with Data Table
const CSVPreview = ({ file, content }) => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  
  useEffect(() => {
    if (content) {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const parsedHeaders = parseCSVLine(lines[0]);
        setHeaders(parsedHeaders);
        const parsedData = lines.slice(1, 100).map(line => parseCSVLine(line));
        setData(parsedData);
      }
    }
  }, [content]);
  
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">{file.name}</span>
          <Badge variant="outline" className="text-xs">{data.length} rows</Badge>
        </div>
        <Button size="sm" variant="outline" as="a" href={URL.createObjectURL(new Blob([content], { type: 'text/csv' }))} download={file.name}>
          <Download className="w-4 h-4 mr-1" />
          Download
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2 border-b text-gray-600 max-w-xs truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Markdown Preview Component
const MarkdownPreview = ({ file, content }) => {
  // Simple markdown rendering (in production, use a library like react-markdown)
  const renderMarkdown = (text) => {
    // Basic markdown processing
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-3">$1</h1>')
      // Bold/Italic
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto"><code>$2</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-200 px-1 rounded">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">$1</blockquote>')
      // Line breaks
      .replace(/\n/gim, '<br />');
    
    return html;
  };
  
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">{file.name}</span>
        </div>
        <Badge variant="outline" className="text-xs">Markdown</Badge>
      </div>
      <div 
        className="flex-1 overflow-auto p-6 prose max-w-none"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </div>
  );
};

// Archive Preview Component
const ArchivePreview = ({ file, contents }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">{file.name}</span>
          <Badge variant="outline" className="text-xs">{contents?.length || 0} files</Badge>
        </div>
        <Button size="sm" variant="outline" as="a" href={file.webContentLink || file.webViewLink} download>
          <Download className="w-4 h-4 mr-1" />
          Download
        </Button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r overflow-auto">
          <div className="p-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Contents</h4>
            <ul className="space-y-1">
              {contents?.map((item, index) => (
                <li 
                  key={index}
                  className={`px-2 py-1 text-sm rounded cursor-pointer flex items-center gap-2 ${
                    selectedFile === index ? 'bg-amber-100 text-amber-800' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedFile(index)}
                >
                  <File className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{item.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          {selectedFile !== null && contents?.[selectedFile] ? (
            <div className="text-center">
              <File className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{contents[selectedFile].name}</p>
              <p className="text-xs text-gray-500">{contents[selectedFile].size}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select a file to preview</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Text Preview Component
const TextPreview = ({ file, content }) => {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">{file.name}</span>
        </div>
        <Badge variant="outline" className="text-xs">Text</Badge>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-sm">
        <code className="text-gray-700 font-mono whitespace-pre">{content}</code>
      </pre>
    </div>
  );
};

// 3D Model Preview Component
const Model3DPreview = ({ file, url, type }) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // In production, integrate with Three.js or Babylon.js for actual 3D rendering
    // This is a placeholder that shows the structure
    setIsLoading(false);
  }, [url]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading 3D model...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-gray-400">Unable to preview 3D model</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            as="a" 
            href={url}
            download
          >
            Download to view
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">{file.name}</span>
          <Badge variant="outline" className="text-xs uppercase">{type}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Drag to rotate • Scroll to zoom</span>
          <Button size="sm" variant="ghost" as="a" href={url} download className="text-gray-400">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Box className="w-16 h-16 text-white" />
          </div>
          <p className="text-gray-400 text-sm">3D Model Preview</p>
          <p className="text-gray-500 text-xs mt-1">
            Use a 3D viewer application to interact with this model
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            as="a" 
            href={url}
            download
          >
            Download Model
          </Button>
        </div>
      </div>
    </div>
  );
};

// GIS Map Preview Component
const GISPreview = ({ file, type }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">{file.name}</span>
          <Badge variant="outline" className="text-xs uppercase">{type}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Eye className="w-4 h-4 mr-1" />
            Full Map
          </Button>
          <Button size="sm" variant="outline" as="a" href={file.webContentLink || file.webViewLink} download>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        {isLoading ? (
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading map data...</p>
          </div>
        ) : (
          <div className="text-center">
            <Map className="w-16 h-16 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Geographic data preview</p>
            <p className="text-gray-500 text-sm mt-1">
              {type === 'shapefile' && 'ESRI Shapefile with geographic features'}
              {type === 'geojson' && 'GeoJSON spatial data'}
              {type === 'kml' && 'Keyhole Markup Language data'}
              {type === 'kmz' && 'Compressed KML with resources'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// CAD Preview Component
const CADPreview = ({ file, type }) => {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">{file.name}</span>
          <Badge variant="outline" className="text-xs uppercase">{type.toUpperCase()}</Badge>
        </div>
        <Button size="sm" variant="outline" as="a" href={file.webContentLink || file.webViewLink} download>
          <Download className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">CAD Drawing Preview</p>
          <p className="text-gray-500 text-sm mt-1">
            {type === 'dwg' ? 'AutoCAD Drawing format' : 'Drawing Exchange Format'}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Use CAD software to view and edit
          </p>
        </div>
      </div>
    </div>
  );
};

// eBook Preview Component
const EbookPreview = ({ file, type }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Book className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">{file.name}</span>
          <Badge variant="outline" className="text-xs uppercase">{type.toUpperCase()}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPage(Math.max(1, page - 1))}>
            Previous
          </Button>
          <span className="text-sm text-gray-600">Page {page}</span>
          <Button size="sm" variant="outline" onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-gray-100 p-8 flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          ) : (
            <div className="max-w-2xl bg-white shadow-lg p-8 rounded-lg">
              <p className="text-gray-600 text-center">
                eBook reader preview for {file.name}
              </p>
              <p className="text-gray-500 text-sm text-center mt-2">
                Full eBook reading experience would be implemented with a library like epub.js
              </p>
            </div>
          )}
        </div>
        <div className="w-48 border-l bg-gray-50 p-4 overflow-auto">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Table of Contents</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="hover:text-amber-600 cursor-pointer">Cover</li>
            <li className="hover:text-amber-600 cursor-pointer">Title Page</li>
            <li className="hover:text-amber-600 cursor-pointer">Chapter 1</li>
            <li className="hover:text-amber-600 cursor-pointer">Chapter 2</li>
            <li className="hover:text-amber-600 cursor-pointer">Chapter 3</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Main FilePreview Component
const FilePreview = ({ file, url }) => {
  const { showToast } = useApp();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { category, type } = detectFileType(file);
  
  // Load text-based content for preview
  useEffect(() => {
    if (['code', 'text', 'markdown', 'csv'].includes(category) && url) {
      setIsLoading(true);
      fetch(url)
        .then(response => response.text())
        .then(text => {
          setContent(text);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Failed to load file content:', error);
          setIsLoading(false);
        });
    }
  }, [url, category]);
  
  const handleDownload = () => {
    const downloadUrl = url || file.webContentLink || file.webViewLink;
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      showToast('Downloading file...', 'info');
    }
  };
  
  // Render appropriate preview based on file type
  switch (category) {
    case 'image':
      return url ? <ImagePreview file={file} url={url} /> : null;
    
    case 'audio':
      return url ? <AudioPreview file={file} url={url} /> : null;
    
    case 'video':
      return url ? <VideoPreview file={file} url={url} /> : null;
    
    case 'code':
      return isLoading ? (
        <div className="flex items-center justify-center h-full bg-gray-900">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <CodePreview file={file} content={content} />
      );
    
    case 'csv':
      return isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <CSVPreview file={file} content={content} />
      );
    
    case 'markdown':
      return isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <MarkdownPreview file={file} content={content} />
      );
    
    case 'text':
      return isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <TextPreview file={file} content={content} />
      );
    
    case 'archive':
      return <ArchivePreview file={file} contents={[]} />;
    
    case '3d':
      return <Model3DPreview file={file} url={url} type={type} />;
    
    case 'gis':
      return <GISPreview file={file} type={type} />;
    
    case 'cad':
      return <CADPreview file={file} type={type} />;
    
    case 'ebook':
      return <EbookPreview file={file} type={type} />;
    
    case 'pdf':
    case 'document':
    case 'spreadsheet':
    case 'presentation':
    case 'google':
      // These are handled by the existing Google Drive viewer
      return null;
    
    default:
      return (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center">
            <File className="w-16 h-16 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-2">Preview not available</p>
            <p className="text-gray-500 text-sm mb-4">File type: {type}</p>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download File
            </Button>
          </div>
        </div>
      );
  }
};

export default FilePreview;
