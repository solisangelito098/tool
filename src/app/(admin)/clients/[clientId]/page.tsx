import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, getClientStats } from "@/lib/actions/client-actions";
import { getBlogs } from "@/lib/actions/blog-actions";
import { getSeoScans, getSeoIssues } from "@/lib/actions/seo-actions";
import { getMessages } from "@/lib/actions/message-actions";
import { getInvoices } from "@/lib/actions/invoice-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BlogTable } from "@/components/blogs/blog-table";
import { MessageThread } from "@/components/messages/message-thread";
import {
  ArrowLeft,
  Pencil,
  Globe,
  BarChart3,
  FileText,
  MessageSquare,
  CreditCard,
  AlertTriangle,
  Wrench,
} from "lucide-react";

interface ClientDetailPageProps {
  params: { clientId: string };
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  onboarding: "secondary",
  paused: "outline",
  churned: "destructive",
};

const billingStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  overdue: "destructive",
  paused: "outline",
  cancelled: "destructive",
};

const invoiceStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "outline",
};

const severityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  warning: "secondary",
  notice: "outline",
};

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSeoScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { clientId } = params;

  // Fetch everything in parallel. If the client itself doesn't exist, 404.
  const [client, stats, blogsResult, scansResult, issuesResult, messages, invoicesResult] =
    await Promise.all([
      getClient(clientId),
      getClientStats(clientId),
      getBlogs({ clientId, pageSize: 50 }).catch(() => ({
        blogs: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      })),
      getSeoScans(undefined, clientId, 1, 10).catch(() => ({
        scans: [],
        total: 0,
        page: 1,
        pageSize: 10,
      })),
      getSeoIssues({ clientId, status: "detected", pageSize: 20 }).catch(() => ({
        issues: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })),
      getMessages({ clientId, pageSize: 100 }).catch(() => []),
      getInvoices({ clientId, pageSize: 50 }).catch(() => ({
        invoices: [],
        total: 0,
        page: 1,
        pageSize: 50,
      })),
    ]).catch(() => {
      notFound();
    }) as [
      Awaited<ReturnType<typeof getClient>>,
      Awaited<ReturnType<typeof getClientStats>>,
      Awaited<ReturnType<typeof getBlogs>>,
      Awaited<ReturnType<typeof getSeoScans>>,
      Awaited<ReturnType<typeof getSeoIssues>>,
      Awaited<ReturnType<typeof getMessages>>,
      Awaited<ReturnType<typeof getInvoices>>,
    ];

  if (!client) notFound();

  // Build a quick lookup for blog domains so SEO/scan rows can show them.
  const blogDomainById = new Map(blogsResult.blogs.map((b) => [b.id, b.domain]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
              <Badge
                variant={
                  client.status ? statusVariant[client.status] ?? "secondary" : "secondary"
                }
              >
                {client.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {client.niche ? `${client.niche} \u00B7 ` : ""}
              Added {new Date(client.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Link href={`/clients/${client.id}?edit=true`}>
          <Button variant="outline">
            <Pencil className="size-4" />
            Edit Client
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Blogs</CardDescription>
            <CardTitle className="text-2xl">{stats.blogCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Avg SEO Score</CardDescription>
            <CardTitle className={`text-2xl ${getSeoScoreColor(stats.avgSeoScore ?? null)}`}>
              {stats.avgSeoScore !== null ? stats.avgSeoScore : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Posts This Month</CardDescription>
            <CardTitle className="text-2xl">{stats.postsThisMonth}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Billing Status</CardDescription>
            <CardTitle className="text-2xl">
              <Badge
                variant={billingStatusVariant[client.billingStatus ?? "active"] ?? "secondary"}
              >
                {client.billingStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Globe className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="blogs">
            <FileText className="size-4" />
            Blogs ({blogsResult.totalCount})
          </TabsTrigger>
          <TabsTrigger value="seo">
            <BarChart3 className="size-4" />
            SEO ({issuesResult.total})
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="size-4" />
            Messages ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="size-4" />
            Billing ({invoicesResult.total})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 pt-4 lg:grid-cols-2">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Company Name</p>
                    <p className="text-sm">{client.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Niche</p>
                    <p className="text-sm">{client.niche || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Contact Name</p>
                    <p className="text-sm">{client.contactName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Contact Email</p>
                    <p className="text-sm">{client.contactEmail || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Contact Phone</p>
                    <p className="text-sm">{client.contactPhone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Blog Target</p>
                    <p className="text-sm">{client.totalBlogsTarget ?? 0} blogs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Info */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Billing Type</p>
                    <p className="text-sm capitalize">
                      {client.billingType?.replace("_", " ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Amount</p>
                    <p className="text-sm">${client.billingAmount || "0.00"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Setup Fee</p>
                    <p className="text-sm">
                      ${client.setupFee || "0.00"}
                      {client.setupFeePaid ? " (paid)" : " (unpaid)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Billing Start</p>
                    <p className="text-sm">{formatDate(client.billingStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Next Billing Date</p>
                    <p className="text-sm">{formatDate(client.nextBillingDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Active Invoices</p>
                    <p className="text-sm">{stats.activeInvoices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {client.notesInternal ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {client.notesInternal}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No internal notes.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Blogs Tab — reuses the standard BlogTable */}
        <TabsContent value="blogs" className="pt-4">
          <BlogTable
            blogs={blogsResult.blogs}
            totalCount={blogsResult.totalCount}
            page={blogsResult.page}
            pageSize={blogsResult.pageSize}
            totalPages={blogsResult.totalPages}
            clientId={client.id}
            showClientColumn={false}
          />
        </TabsContent>

        {/* SEO Tab — recent scans + open issues */}
        <TabsContent value="seo" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent SEO Scans</CardTitle>
              <CardDescription>Last 10 scans across this client&apos;s blogs.</CardDescription>
            </CardHeader>
            <CardContent>
              {scansResult.scans.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No SEO scans yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Blog</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Critical</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scansResult.scans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(scan.scannedAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {blogDomainById.get(scan.blogId) ?? scan.blogId.slice(0, 8)}
                        </TableCell>
                        <TableCell className={`font-medium ${getSeoScoreColor(scan.overallScore)}`}>
                          {scan.overallScore}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {scan.pagesCrawled ?? 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {scan.issuesFound ?? 0}
                        </TableCell>
                        <TableCell>
                          {scan.criticalIssues && scan.criticalIssues > 0 ? (
                            <Badge variant="destructive">{scan.criticalIssues}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Open SEO Issues</CardTitle>
                  <CardDescription>
                    {issuesResult.total} unresolved issue{issuesResult.total === 1 ? "" : "s"}.
                  </CardDescription>
                </div>
                {issuesResult.total > 0 && (
                  <Link href={`/seo/fix-queue?clientId=${client.id}`}>
                    <Button variant="outline" size="sm">
                      <Wrench className="size-4" />
                      Fix Queue
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {issuesResult.issues.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No open issues — nice.
                </p>
              ) : (
                <div className="space-y-2">
                  {issuesResult.issues.slice(0, 10).map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-start gap-3 rounded-md border p-3"
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={severityVariant[issue.severity] ?? "outline"}>
                            {issue.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {issue.category}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {blogDomainById.get(issue.blogId) ?? ""}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{issue.title}</p>
                        {issue.pageUrl && (
                          <p className="truncate text-xs text-muted-foreground">
                            {issue.pageUrl}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {issuesResult.issues.length > 10 && (
                    <p className="pt-2 text-center text-xs text-muted-foreground">
                      Showing first 10 of {issuesResult.total} issues.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <MessageThread clientId={client.id} messages={messages} isAdmin={true} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>
                    {invoicesResult.total} invoice{invoicesResult.total === 1 ? "" : "s"} on file.
                  </CardDescription>
                </div>
                <Link href={`/invoices?clientId=${client.id}`}>
                  <Button variant="outline" size="sm">
                    All Invoices
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {invoicesResult.invoices.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No invoices yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesResult.invoices.map(({ invoice }) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {invoice.type}
                        </TableCell>
                        <TableCell>
                          {invoice.currency} ${Number(invoice.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(invoice.dueDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={invoiceStatusVariant[invoice.status ?? "draft"] ?? "outline"}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {invoice.paidAt ? formatDate(invoice.paidAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
