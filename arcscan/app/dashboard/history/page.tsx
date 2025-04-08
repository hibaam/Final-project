import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function AnalysisHistory() {
  const analysisHistory = [
    { id: 1, title: 'Introduction to AI', type: 'Video', date: '2023-05-01', status: 'Completed' },
    { id: 2, title: 'Machine Learning Basics', type: 'YouTube', date: '2023-05-03', status: 'Completed' },
    { id: 3, title: 'Data Science Overview', type: 'Video', date: '2023-05-05', status: 'In Progress' },
    { id: 4, title: 'Neural Networks Explained', type: 'YouTube', date: '2023-05-07', status: 'Completed' },
    { id: 5, title: 'Deep Learning Applications', type: 'Video', date: '2023-05-09', status: 'Failed' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Analysis History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Video Analyses</CardTitle>
          <CardDescription>A complete history of your video and YouTube link analyses</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysisHistory.map((analysis) => (
                <TableRow key={analysis.id}>
                  <TableCell>{analysis.title}</TableCell>
                  <TableCell>{analysis.type}</TableCell>
                  <TableCell>{analysis.date}</TableCell>
                  <TableCell>{analysis.status}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">View Results</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

