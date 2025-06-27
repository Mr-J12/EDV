
import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Search, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ExcelProcessor } from '@/utils/excelProcessor';
import { FuzzySearch } from '@/utils/fuzzySearch';

interface ValidationError {
  cellAddress: string;
  row: number;
  column: string;
  message: string;
  type: 'phone' | 'email' | 'blank' | 'numeric' | 'date' | 'unique';
}

interface SheetData {
  headers: string[];
  rows: any[][];
  originalData: any[];
}

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const filteredData = useMemo(() => {
    if (!sheetData || !searchQuery.trim()) return sheetData?.originalData || [];
    
    const fuzzySearch = new FuzzySearch(sheetData.originalData, sheetData.headers);
    return fuzzySearch.search(searchQuery);
  }, [sheetData, searchQuery]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only .xlsx Excel files",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setValidationErrors([]);
    setSheetData(null);
    setSearchQuery('');

    try {
      const processor = new ExcelProcessor();
      const result = await processor.processFile(selectedFile);
      
      if (result.errors.length > 0) {
        setValidationErrors(result.errors);
        toast({
          title: "Validation Errors Found",
          description: `${result.errors.length} validation error(s) detected. Please fix them before proceeding.`,
          variant: "destructive"
        });
      } else {
        setSheetData(result.data);
        toast({
          title: "File Processed Successfully",
          description: "Your Excel file has been validated and loaded successfully!",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "Failed to process the Excel file",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setFile(null);
    setSheetData(null);
    setValidationErrors([]);
    setSearchQuery('');
  };

  const getErrorTypeColor = (type: ValidationError['type']) => {
    const colors = {
      phone: 'bg-orange-100 text-orange-800',
      email: 'bg-blue-100 text-blue-800',
      blank: 'bg-red-100 text-red-800',
      numeric: 'bg-purple-100 text-purple-800',
      date: 'bg-yellow-100 text-yellow-800',
      unique: 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-500 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Excel Data Validator
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload, validate, and search through your Excel data with advanced fuzzy matching and comprehensive validation
          </p>
        </div>

        {/* Upload Section */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              File Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFile}
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-sm text-gray-600">Processing file...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drop your Excel file here or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      Only .xlsx files are supported (single sheet only)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button className="cursor-pointer">
                      Select Excel File
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Validation Errors ({validationErrors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {validationErrors.map((error, index) => (
                  <Alert key={index} className="border-red-200">
                    <AlertDescription className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getErrorTypeColor(error.type)}>
                            {error.type.toUpperCase()}
                          </Badge>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {error.cellAddress}
                          </code>
                        </div>
                        <p className="text-sm">
                          <strong>Row {error.row}, Column {error.column}:</strong> {error.message}
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Display */}
        {sheetData && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Validated Data ({filteredData.length} rows)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search across all columns (fuzzy search enabled)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-80"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {sheetData.headers.map((header, index) => (
                          <th key={index} className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                          {sheetData.headers.map((header, colIndex) => (
                            <td key={colIndex} className="px-4 py-3 text-sm text-gray-900">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredData.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature Info */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Upload className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Smart Upload</h3>
              <p className="text-sm text-gray-600">
                Drag & drop or click to upload. Automatic validation ensures data quality.
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Search className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Fuzzy Search</h3>
              <p className="text-sm text-gray-600">
                Advanced search with typo tolerance and partial matching across all columns.
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Data Validation</h3>
              <p className="text-sm text-gray-600">
                Comprehensive validation for emails, phones, dates, and duplicate detection.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
