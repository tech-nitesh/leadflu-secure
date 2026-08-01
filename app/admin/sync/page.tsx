"use client";
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { getAccessToken, authorizeSheets } from '@/lib/firebase';
import { pushLeadsToSheet, pullLeadsFromSheet, createSpreadsheet } from '@/lib/google-sheets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Database, RefreshCw, UploadCloud, DownloadCloud, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function SheetsSyncPage() {
  const { leads, setLeads, spreadsheetId, setSpreadsheetId } = useStore();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inputSheetId, setInputSheetId] = useState(spreadsheetId || '');

  React.useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  React.useEffect(() => {
    if (!spreadsheetId) return;
    const handle = requestAnimationFrame(() => setInputSheetId(spreadsheetId));
    return () => cancelAnimationFrame(handle);
  }, [spreadsheetId]);

  if (!isMounted) return <div className="p-6">Loading...</div>;

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const result = await authorizeSheets();
        if (result.usedRedirect) {
          setError("Google Sheets authorization is completing in a redirect. Finish it, then retry the sync.");
          return;
        }
        if (!result.accessToken) throw new Error("Google Sheets authorization did not return an access token.");
        token = result.accessToken;
      }
      await action();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = () => handleAction(async () => {
    if (!inputSheetId) throw new Error("No spreadsheet ID provided");
    const token = await getAccessToken();
    await pushLeadsToSheet(token!, inputSheetId, leads);
    setSpreadsheetId(inputSheetId);
    setSuccess("Successfully pushed leads to Google Sheets.");
  });

  const handlePull = () => handleAction(async () => {
    if (!inputSheetId) throw new Error("No spreadsheet ID provided");
    const token = await getAccessToken();
    const pulledLeads = await pullLeadsFromSheet(token!, inputSheetId);
    if (pulledLeads.length > 0) {
      setLeads(pulledLeads);
      setSpreadsheetId(inputSheetId);
      setSuccess(`Successfully pulled ${pulledLeads.length} leads from Google Sheets.`);
    } else {
      setSuccess("Spreadsheet is empty or invalid format.");
    }
  });

  const handleCreate = () => handleAction(async () => {
    const token = await getAccessToken();
    const newId = await createSpreadsheet(token!, 'Editor Leads Backup');
    setInputSheetId(newId);
    setSpreadsheetId(newId);
    await pushLeadsToSheet(token!, newId, leads);
    setSuccess(`Created new spreadsheet and pushed leads. ID: ${newId}`);
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Google Sheets Sync</h1>
        <p className="text-zinc-500">Bi-directional sync between the platform and Google Sheets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Link a Google Spreadsheet ID to sync leads data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheetId">Spreadsheet ID</Label>
            <div className="flex gap-2">
              <Input 
                id="sheetId"
                value={inputSheetId}
                onChange={e => setInputSheetId(e.target.value)}
                placeholder="e.g. 1BxiMvs0X15uQaPglHX2..."
                className="flex-1"
              />
              <Button onClick={() => setSpreadsheetId(inputSheetId)} variant="secondary">Save</Button>
            </div>
            <p className="text-xs text-zinc-500">You can find this in the URL of your Google Sheet.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-500" /> Push to Sheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 mb-4">Overwrite the Google Sheet with the current database.</p>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white border-none" onClick={handlePush} disabled={loading || !inputSheetId}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Push Data
            </Button>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-amber-500" /> Pull from Sheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 mb-4">Overwrite the local database with rows from Google Sheets.</p>
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white border-none" onClick={() => {
              if (window.confirm("This will overwrite all local leads. Continue?")) {
                handlePull();
              }
            }} disabled={loading || !inputSheetId}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Pull Data
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" /> Create New
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 mb-4">Create a brand new Google Sheet and push current leads.</p>
            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-none" onClick={handleCreate} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Sheet
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}
    </div>
  );
}
