'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { parseCSV, validateImportData, mapAndImportColumns, createCustomFieldsFromHeaders } from '@/lib/project-import-export';
import { Upload, AlertCircle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ProjectImportWizardProps {
  projectId: string;
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 'upload' | 'preview' | 'mapping' | 'confirm';

export function ProjectImportWizard({ projectId, onComplete, onCancel }: ProjectImportWizardProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setValidationErrors([]);

    try {
      const isCsv =
        selectedFile.type === 'text/csv' || selectedFile.name.toLowerCase().endsWith('.csv');

      const isXlsx =
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.name.toLowerCase().endsWith('.xlsx');

      if (!isCsv && !isXlsx) {
        throw new Error('Please select a CSV or XLSX file');
      }

      if (!isCsv && isXlsx) {
        // XLSX parsing will be enabled in the next step
        throw new Error('XLSX parsing not yet enabled');
      }

      // CSV parsing
      const text = await selectedFile.text();
      const data = parseCSV(text);

      const validation = validateImportData(data);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        throw new Error(validation.errors[0]);
      }

      setFile(selectedFile);
      setCsvData(data);
      setHeaders(data[0]);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleColumnMapping = (originalHeader: string, mappedName: string) => {
    setMapping(prev => ({
      ...prev,
      [originalHeader]: mappedName,
    }));
  };

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const userId = profile?.id;
      if (!userId) throw new Error('User profile not loaded. Please sign in again.');
      
      // Create custom fields from headers
      await createCustomFieldsFromHeaders(projectId, headers);

      // Import data with mapping
      await mapAndImportColumns(
        projectId,
        headers,
        mapping,
        csvData,
        userId
      );

      toast({
        title: 'Success',
        description: `Imported ${csvData.length - 1} rows successfully`,
      });

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      toast({
        title: 'Error',
        description: 'Failed to import data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const previewRows = csvData.slice(1, 6); // Show first 5 rows

  return (
    <>
      {step === 'upload' && (
        <Dialog open={true} onOpenChange={onCancel}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Project Data</DialogTitle>
              <DialogDescription>
                Upload a CSV file to populate your project with data
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50" 
                   onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium">Click to select CSV file</p>
                <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {file && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{file.name}</p>
                    <p className="text-xs text-green-700">{file.size} bytes</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 rounded">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="space-y-2">
                  {validationErrors.map((err, i) => (
                    <div key={i} className="flex items-start space-x-2 p-3 bg-yellow-50 rounded">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">{err}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={() => setStep('preview')} disabled={!file}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {step === 'preview' && (
        <Dialog open={true} onOpenChange={onCancel}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview Data</DialogTitle>
              <DialogDescription>
                Review your data before importing
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-xs truncate max-w-[100px]">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-500">
                Showing {Math.min(5, csvData.length - 1)} of {csvData.length - 1} rows
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep('mapping')}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {step === 'mapping' && (
        <Dialog open={true} onOpenChange={onCancel}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Map Columns</DialogTitle>
              <DialogDescription>
                Adjust column names if needed
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
              {headers.map((header, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Label className="w-32 text-sm">Column {i + 1}:</Label>
                  <Input
                    value={mapping[header] || header}
                    onChange={(e) => handleColumnMapping(header, e.target.value)}
                    placeholder="Column name"
                    className="flex-1"
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('preview')}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep('confirm')}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {step === 'confirm' && (
        <AlertDialog open={true} onOpenChange={onCancel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Import</AlertDialogTitle>
              <AlertDialogDescription>
                This will import {csvData.length - 1} rows with {headers.length} columns.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <p className="text-sm font-medium">Columns to import:</p>
              <ul className="text-sm space-y-1">
                {headers.map((h, i) => (
                  <li key={i} className="text-gray-600">
                    • {mapping[h] || h}
                  </li>
                ))}
              </ul>
            </div>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={isLoading}>
              {isLoading ? 'Importing...' : 'Import'}
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
