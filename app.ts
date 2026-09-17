import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx-js-style';

interface RetailerProduct {
  productId: number;
  productName: string;
  salesCount: number;
}

interface SalesResult {
  retailerId: number;
  retailerName: string;
  salesCount: number;
  products: RetailerProduct[];
}

interface ProductSalesResult {
  productId: number;
  productName: string;
  salesCount: number;
}

interface SalesSummaryRequest {
  geography: string;
  dateFrom: string | null;
  dateTo: string | null;
}

interface SalesSummaryResponse {
  requestId: string;
  geography: string;
  dateFrom: string;
  dateTo: string;
  totalRetailers: number;
  retailers: SalesResult[];
  products: ProductSalesResult[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {

  constructor(
    private http: HttpClient
  ) {}
  // ============================================================
  // FORM VALUES
  // ============================================================

  geography = '';

  dateFrom: string | null = null;

  dateTo: string | null = null;

  allLocationCities: string[] = [
    'Hyderabad',
    'Delhi',
    'Mumbai',
    'Bangalore',
    'Chennai',
    'Pune',
    'Kolkata',
    'Ahmedabad'
  ];

  // ============================================================
  // DATE LIMITS
  // ============================================================

  minDate = '2025-08-01';

  maxDate = this.getTodayDate();


  // ============================================================
  // APPLICATION STATE
  // ============================================================

  response = signal<SalesSummaryResponse | null>(null);

  sortedRetailers = signal<SalesResult[]>([]);

  productSales = signal<ProductSalesResult[]>([]);

  loading = signal(false);

  error = signal('');

  showRetry = signal(false);

  usedDefaultDateRange = signal(false);

  expandedRetailerId = signal<number | null>(null);

  sortOrder = signal<'desc' | 'asc'>('desc');

  darkMode = signal(false);


  // ============================================================
  // OTHER VALUES
  // ============================================================

  currentTime = '';

  private readonly apiUrl =
    'https://localhost:7128/api/SalesSummary';


  // ============================================================
  // GET TODAY'S DATE
  // ============================================================

  private getTodayDate(): string {

    const today = new Date();

    const year =
      today.getFullYear();

    const month =
      String(today.getMonth() + 1)
        .padStart(2, '0');

    const day =
      String(today.getDate())
        .padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getTodayForTemplate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  getToDateMin(): string {
    return this.dateFrom || this.minDate;
  }

  private formatDateForReport(
    date: string | null | undefined
  ): string {
    if (!date) {
      return '';
    }

    const [year, month, day] = date.split('-');

    return `${day}-${month}-${year}`;
  }

  // ============================================================
  // LOCATION CHANGE
  // ============================================================

  onGeographyChange(): void {
    this.dateFrom = '';
    this.dateTo = '';

    this.error.set('');
    this.response.set(null);
    this.sortedRetailers.set([]);
    this.productSales.set([]);
    this.expandedRetailerId.set(null);
    this.showRetry.set(false);
    this.usedDefaultDateRange.set(false);
    this.currentTime = '';
  }


  // ============================================================
  // OPEN DATE PICKER
  // ============================================================

  openDatePicker(event: Event): void {

    const input =
      event.target as HTMLInputElement & {
        showPicker?: () => void;
      };

    if (
      input &&
      typeof input.showPicker === 'function'
    ) {

      try {

        input.showPicker();

      } catch {

        // Browser may already have the picker open.

      }
    }
  }


  // ============================================================
  // SEARCH
  // ============================================================

  search(): void {

    // ------------------------------------------------------------
    // CLEAR PREVIOUS RESULTS
    // ------------------------------------------------------------

    this.error.set('');

    this.showRetry.set(false);

    this.response.set(null);

    this.sortedRetailers.set([]);

    this.productSales.set([]);

    this.expandedRetailerId.set(null);

    this.usedDefaultDateRange.set(false);


    // ------------------------------------------------------------
    // LOCATION VALIDATION
    // ------------------------------------------------------------

    if (
      !this.geography ||
      this.geography.trim() === ''
    ) {

      this.error.set(
        'Please select a location.'
      );

      return;
    }


    // ------------------------------------------------------------
    // DATE VALIDATION
    // ------------------------------------------------------------

    const hasDateFrom =
      !!this.dateFrom &&
      this.dateFrom.trim() !== '';

    const hasDateTo =
      !!this.dateTo &&
      this.dateTo.trim() !== '';


    // Only one date selected
    if (hasDateFrom !== hasDateTo) {

      this.error.set(
        'Please select both Start Date and End Date.'
      );

      return;
    }


    // Start date cannot be after end date
    if (
      hasDateFrom &&
      hasDateTo &&
      this.dateFrom! > this.dateTo!
    ) {

      this.error.set(
        'Start Date cannot be later than End Date.'
      );

      return;
    }

    const today = this.getTodayForTemplate();

    if (
      this.dateFrom &&
      this.dateTo &&
      this.dateFrom === today &&
      this.dateTo > today
    ) {
      this.error.set(
        'When the start date is today, the end date cannot be a future date.'
      );
      return;
    }

    // ------------------------------------------------------------
    // DEFAULT DATE RANGE
    // ------------------------------------------------------------

    if (!hasDateFrom && !hasDateTo) {

      this.usedDefaultDateRange.set(true);
    }


    // ------------------------------------------------------------
    // CREATE REQUEST
    // ------------------------------------------------------------

    const request: SalesSummaryRequest = {

      // Keep "geography" as the API property name.
      // The UI displays this as "Location".
      geography: this.geography,

      dateFrom: hasDateFrom
        ? this.dateFrom
        : null,

      dateTo: hasDateTo
        ? this.dateTo
        : null
    };


    console.log(
      'Sending request:',
      request
    );


    // ------------------------------------------------------------
    // START LOADING
    // ------------------------------------------------------------

    this.loading.set(true);


    // ------------------------------------------------------------
    // CALL BACKEND
    // ------------------------------------------------------------

    this.http
      .post<SalesSummaryResponse>(
        this.apiUrl,
        request
      )
      .subscribe({

        next: (result) => {

          console.log(
            'API response:',
            result
          );


          // ------------------------------------------------------
          // STORE COMPLETE RESPONSE
          // ------------------------------------------------------

          this.response.set(
            result
          );


          // ------------------------------------------------------
          // PRODUCT SALES
          // ------------------------------------------------------

          this.productSales.set(
            result.products || []
          );


          // ------------------------------------------------------
          // RETAILER SALES
          // ------------------------------------------------------

          const retailers =
            result.retailers || [];


          const sorted =
            [...retailers].sort(
              (a, b) =>
                b.salesCount -
                a.salesCount
            );


          this.sortedRetailers.set(
            sorted
          );


          // ------------------------------------------------------
          // RESET EXPANSION
          // ------------------------------------------------------

          this.expandedRetailerId.set(
            null
          );


          // ------------------------------------------------------
          // RESET SORT
          // ------------------------------------------------------

          this.sortOrder.set(
            'desc'
          );


          // ------------------------------------------------------
          // CURRENT TIME
          // ------------------------------------------------------

          this.currentTime =
            new Date().toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });


          // ------------------------------------------------------
          // STOP LOADING
          // ------------------------------------------------------

          this.loading.set(false);
        },


        error: (error) => {

          console.error(
            'Sales summary error:',
            error
          );


          const status =
            error?.status;


          // ------------------------------------------------------
          // VALIDATION ERROR
          // ------------------------------------------------------

          if (status === 400) {

            this.error.set(
              error?.error?.message ||
              'Please check the entered values.'
            );

            this.showRetry.set(
              false
            );

            this.loading.set(
              false
            );

            return;
          }


          // ------------------------------------------------------
          // CONNECTION ERROR
          // ------------------------------------------------------

          if (status === 0) {

            this.error.set(
              'Unable to connect to the server. Please try again.'
            );

            this.showRetry.set(
              true
            );

            this.loading.set(
              false
            );

            return;
          }


          // ------------------------------------------------------
          // SERVER ERROR
          // ------------------------------------------------------

          if (status === 500) {

            this.error.set(
              error?.error?.message ||
              'Unable to process your request. Please try again.'
            );

            this.showRetry.set(
              true
            );

            this.loading.set(
              false
            );

            return;
          }


          // ------------------------------------------------------
          // OTHER ERRORS
          // ------------------------------------------------------

          this.error.set(
            'Something went wrong. Please try again.'
          );

          this.showRetry.set(
            true
          );

          this.loading.set(
            false
          );
        }

      });

  }


  // ============================================================
  // RETRY
  // ============================================================

  retry(): void {

    this.search();
  }


  // ============================================================
  // RETAILER EXPANSION
  // ============================================================

  toggleRetailer(
    retailerId: number
  ): void {

    console.log(
      'CLICKED RETAILER:',
      retailerId
    );


    if (
      this.expandedRetailerId() ===
      retailerId
    ) {

      // Close retailer
      this.expandedRetailerId.set(
        null
      );

    } else {

      // Open retailer
      this.expandedRetailerId.set(
        retailerId
      );
    }
  }

  applySort(order: 'asc' | 'desc'): void {

    const sorted = [...this.sortedRetailers()].sort(
      (a, b) =>
        order === 'asc'
          ? a.salesCount - b.salesCount
          : b.salesCount - a.salesCount
    );

    this.sortedRetailers.set(sorted);
  }

  // ============================================================
  // RETAILER SORT
  // ============================================================

  toggleSort(): void {

  const newOrder =
    this.sortOrder() === 'desc'
      ? 'asc'
      : 'desc';

  this.sortOrder.set(newOrder);

  this.applySort(newOrder);
}


  // Keep this method in case another
  // part of the HTML calls sortRetailers().
  sortRetailers(): void {

    this.toggleSort();
  }


  // ============================================================
  // TOTAL SALES
  // ============================================================

  getTotalSales(): number {

    return this.sortedRetailers().reduce(
      (total, retailer) =>
        total + retailer.salesCount,
      0
    );
  }


  // ============================================================
  // TOP PERFORMER
  // ============================================================

  getTopPerformers(): SalesResult[] {
    const retailers = this.sortedRetailers();

    if (retailers.length === 0) {
      return [];
    }

    const highestSales = Math.max(
      ...retailers.map(item => item.salesCount)
    );

    return retailers.filter(
      item => item.salesCount === highestSales
    );
  }

  getTopPerformerNames(): string {

    return this.getTopPerformers()
      .map(item => item.retailerName)
      .join(', ');
  }


  // ============================================================
  // TOP PERFORMER PERCENTAGE
  // ============================================================

  getTopPerformerPercentage(): number {
    const topPerformers = this.getTopPerformers();

    if (topPerformers.length === 0) {
      return 0;
    }

    const totalSales = this.getTotalSales();

    if (totalSales === 0) {
      return 0;
    }

    const topSales = topPerformers[0].salesCount;

    return Math.round((topSales / totalSales) * 100);
  }


  // ============================================================
  // KEY INSIGHT
  // ============================================================

  getKeyInsight(): string {
    const topPerformers = this.getTopPerformers();

    if (topPerformers.length === 0) {
      return 'No sales data available for the selected period.';
    }

    const topNames = topPerformers
      .map(item => item.retailerName)
      .join(', ');

    const percentage = this.getTopPerformerPercentage();

    if (topPerformers.length === 1) {
      return `${topNames} is contributing ${percentage}% of total sales.`;
    }

    return `${topNames} are each contributing ${percentage}% of total sales.`;
  }


  // ============================================================
  // RETAILER BAR CHART PERCENTAGE
  // ============================================================

  getSalesPercentage(
    salesCount: number,
    retailers: SalesResult[]
  ): number {

    if (
      !retailers ||
      retailers.length === 0
    ) {

      return 0;
    }


    const maxSales =
      Math.max(
        ...retailers.map(
          retailer =>
            retailer.salesCount
        )
      );


    if (maxSales === 0) {

      return 0;
    }


    return (
      salesCount /
      maxSales
    ) * 100;
  }


  // ============================================================
  // PRODUCT CHART HELPERS
  // ============================================================

  getTotalProductSales(): number {

    return this.productSales().reduce(
      (total, product) =>
        total + product.salesCount,
      0
    );
  }


  // ============================================================
  // PRODUCT PERCENTAGE
  // ============================================================

  getProductPercentage(
    salesCount: number
  ): number {

    const total =
      this.getTotalProductSales();


    if (total === 0) {

      return 0;
    }


    return (
      salesCount /
      total
    ) * 100;
  }


  // ============================================================
  // PRODUCT COLORS
  // ============================================================

  getProductColor(
    index: number
  ): string {

    const colors = [
      '#6366f1',
      '#22c55e',
      '#f59e0b',
      '#ef4444',
      '#06b6d4',
      '#8b5cf6',
      '#ec4899',
      '#84cc16',
      '#f97316',
      '#14b8a6'
 
    ];


    return colors[
      index % colors.length
    ];
  }


  // ============================================================
  // BUILD PRODUCT DONUT
  // ============================================================

  buildProductDonut(): string {

    const products =
      this.productSales();


    if (
      !products ||
      products.length === 0
    ) {

      return 'conic-gradient(#e5e7eb 0% 100%)';
    }


    const total =
      this.getTotalProductSales();


    if (total === 0) {

      return 'conic-gradient(#e5e7eb 0% 100%)';
    }


    let currentPercentage = 0;


    const segments =
      products.map(
        (product, index) => {

          const percentage =
            this.getProductPercentage(
              product.salesCount
            );


          const start =
            currentPercentage;


          const end =
            currentPercentage +
            percentage;


          currentPercentage = end;


          return (
            `${this.getProductColor(index)} ` +
            `${start}% ${end}%`
          );
        }
      );


    return (
      `conic-gradient(${segments.join(', ')})`
    );
  }
  getDonutSegmentPercentage(index: number): number {
    const product = this.productSales()[index];
    return this.getProductPercentage(product.salesCount);
  }

  getDonutSegmentOffset(index: number): number {
    let offset = 0;

    for (let i = 0; i < index; i++) {
      offset += this.getProductPercentage(
        this.productSales()[i].salesCount
      );
    }

    return -offset;
  }
  getProductTooltip(index: number): string {
    const product = this.productSales()[index];

    if (!product) {
      return '';
    }

    return `${product.productName} - ${product.salesCount} sales`;
  }

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  clearFilters(): void {

    this.geography = '';

    this.dateFrom = null;

    this.dateTo = null;


    this.response.set(
      null
    );

    this.sortedRetailers.set(
      []
    );

    this.productSales.set(
      []
    );

    this.expandedRetailerId.set(
      null
    );


    this.error.set('');

    this.showRetry.set(false);

    this.usedDefaultDateRange.set(false);

    this.currentTime = '';

    this.sortOrder.set(
      'desc'
    );
  }


  // ============================================================
  // THEME
  // ============================================================

  toggleTheme(): void {

    this.darkMode.update(
      value => !value
    );
  }


  // Keep old method name in case
  // another part of the HTML uses it.
  toggleDarkMode(): void {

    this.toggleTheme();
  }

  // ============================================================
  // DOWNLOAD EXCEL REPORT
  // ============================================================

  downloadReport(): void {

    const data =
      this.response();

    if (!data) {
      return;
    }


    // ------------------------------------------------------------
    // CREATE WORKBOOK
    // ------------------------------------------------------------

    const workbook =
      XLSX.utils.book_new();


    // ------------------------------------------------------------
    // COMMON STYLES
    // ------------------------------------------------------------

    const titleStyle = {
      font: {
        bold: true,
        sz: 16
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      }
    };

    const headingStyle = {
      font: {
        bold: true
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      border: {
        top: {
          style: 'thin'
        },
        bottom: {
          style: 'thin'
        },
        left: {
          style: 'thin'
        },
        right: {
          style: 'thin'
        }
      }
    };

    const cellStyle = {
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      border: {
        top: {
          style: 'thin'
        },
        bottom: {
          style: 'thin'
        },
        left: {
          style: 'thin'
        },
        right: {
          style: 'thin'
        }
      }
    };


    // ============================================================
    // SHEET 1 - SUMMARY
    // ============================================================

    const summaryRows: any[][] = [

      [
        'Retailer Sales Summary'
      ],

      [],

      [
        'Location',
        data.geography === 'All Geographies'
          ? 'All Locations'
          : data.geography
      ],

      ['Start Date (DD-MM-YYYY)', this.formatDateForReport(data.dateFrom)],
      ['End Date (DD-MM-YYYY)', this.formatDateForReport(data.dateTo)],
      [
        'Generated At',
        this.currentTime
      ],
      
      [],

      [
        'Summary Metric',
        'Value'
      ],

      [
        'Total Sales',
        this.getTotalSales()
      ],

      [
        'Top Performer',
        this.getTopPerformerNames()
      ],

      [
        'Top Performer Contribution',
        `${this.getTopPerformerPercentage().toFixed(1)}%`
      ],

      [
        'Key Insight',
        this.getKeyInsight()
      ]

    ];


    const summarySheet =
      XLSX.utils.aoa_to_sheet(
        summaryRows
      );


    // Merge title

    summarySheet['!merges'] = [
      {
        s: {
          r: 0,
          c: 0
        },
        e: {
          r: 0,
          c: 1
        }
      }
    ];


    // Column widths

    summarySheet['!cols'] = [
      {
        wch: 30
      },
      {
        wch: 65
      }
    ];


    // Title style

    summarySheet['A1'].s =
      titleStyle;


    // Information rows

    for (
      let row = 2;
      row <= 5;
      row++
    ) {

      summarySheet[
        XLSX.utils.encode_cell({
          r: row,
          c: 0
        })
      ].s = headingStyle;

      summarySheet[
        XLSX.utils.encode_cell({
          r: row,
          c: 1
        })
      ].s = cellStyle;
    }


    // Summary table headings

    summarySheet['A8'].s =
      headingStyle;

    summarySheet['B8'].s =
      headingStyle;


    // Summary table values

    for (
      let row = 8;
      row <= 11;
      row++
    ) {

      summarySheet[
        XLSX.utils.encode_cell({
          r: row,
          c: 0
        })
      ].s = cellStyle;

      summarySheet[
        XLSX.utils.encode_cell({
          r: row,
          c: 1
        })
      ].s = cellStyle;
    }


    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      'Summary'
    );


    // ============================================================
    // SHEET 2 - RETAILER SALES
    // ============================================================

    const retailerRows: any[][] = [

      [
        'Retailer',
        'Location',
        'Product',
        'Sales Count'
      ]

    ];


    for (
      const retailer
      of data.retailers || []
    ) {

      const location =
        data.geography === 'All Geographies'
          ? 'All Locations'
          : data.geography;


      // ----------------------------------------------------------
      // PRODUCT ROWS
      // ----------------------------------------------------------

      if (
        retailer.products &&
        retailer.products.length > 0
      ) {

        for (
          const product
          of retailer.products
        ) {

          retailerRows.push([
            retailer.retailerName,
            location,
            product.productName,
            product.salesCount
          ]);
        }
      }


      // ----------------------------------------------------------
      // RETAILER TOTAL ROW
      // ----------------------------------------------------------

      retailerRows.push([
        `${retailer.retailerName} Total`,
        location,
        'Total Sales',
        retailer.salesCount
      ]);


      // ----------------------------------------------------------
      // SEPARATOR ROW
      // ----------------------------------------------------------

      retailerRows.push([
        '',
        '',
        '',
        ''
      ]);
    }


    const retailerSheet =
      XLSX.utils.aoa_to_sheet(
        retailerRows
      );


    // ------------------------------------------------------------
    // COLUMN WIDTHS
    // ------------------------------------------------------------

    retailerSheet['!cols'] = [
      {
        wch: 30
      },
      {
        wch: 25
      },
      {
        wch: 35
      },
      {
        wch: 18
      }
    ];


    // ------------------------------------------------------------
    // HEADER STYLING
    // ------------------------------------------------------------

    retailerSheet['A1'].s =
      headingStyle;

    retailerSheet['B1'].s =
      headingStyle;

    retailerSheet['C1'].s =
      headingStyle;

    retailerSheet['D1'].s =
      headingStyle;


    // ------------------------------------------------------------
    // BODY STYLING
    // ------------------------------------------------------------

    for (
      let row = 1;
      row < retailerRows.length;
      row++
    ) {

      for (
        let column = 0;
        column < 4;
        column++
      ) {

        const cell =
          retailerSheet[
            XLSX.utils.encode_cell({
              r: row,
              c: column
            })
          ];

        if (cell) {

          const rowData =
            retailerRows[row];

          const isTotalRow =
            rowData[2] === 'Total Sales';


          cell.s = {
            ...cellStyle,

            alignment: {
              ...cellStyle.alignment,

              horizontal:
                column === 3
                  ? 'right'
                  : column === 1
                    ? 'center'
                    : 'left'
            }
          };
        }
      }
    }
    // ------------------------------------------------------------
    // TOTAL ROW STYLING
    // ------------------------------------------------------------

    for (
      let row = 1;
      row < retailerRows.length;
      row++
    ) {

      if (retailerRows[row][2] === 'Total Sales') {

        for (
          let column = 0;
          column < 4;
          column++
        ) {

          const cell =
            retailerSheet[
              XLSX.utils.encode_cell({
                r: row,
                c: column
              })
            ];

          if (cell) {
            cell.s = {
              ...cell.s,
              font: {
                bold: true
              }
            };
          }
        }
      }
    }


    XLSX.utils.book_append_sheet(
      workbook,
      retailerSheet,
      'Retailer Sales'
    );


    // ============================================================
    // SHEET 3 - PRODUCT SALES
    // ============================================================

    const productRows: any[][] = [

      [
        'Product',
        'Sales Count',
        'Sales Distribution (%)'
      ]

    ];


    for (
      const product
      of data.products || []
    ) {

      productRows.push([

        product.productName,

        product.salesCount,

        `${this.getProductPercentage(
          product.salesCount
        ).toFixed(1)}%`

      ]);
    }


    const productSheet =
      XLSX.utils.aoa_to_sheet(
        productRows
      );


    productSheet['!cols'] = [
      {
        wch: 35
      },
      {
        wch: 18
      },
      {
        wch: 25
      }
    ];


    // Header styling

    productSheet['A1'].s =
      headingStyle;

    productSheet['B1'].s =
      headingStyle;

    productSheet['C1'].s =
      headingStyle;


    // Body styling

    for (
      let row = 1;
      row < productRows.length;
      row++
    ) {

      for (
        let column = 0;
        column < 3;
        column++
      ) {

        const cell =
          productSheet[
            XLSX.utils.encode_cell({
              r: row,
              c: column
            })
          ];

        if (cell) {
          cell.s = cellStyle;
        }
      }
    }


    XLSX.utils.book_append_sheet(
      workbook,
      productSheet,
      'Product Sales'
    );


    // ============================================================
    // FILE NAME
    // ============================================================

    const location =
      data.geography
        .replace(
          /[^a-zA-Z0-9]+/g,
          '_'
        )
        .replace(
          /^_+|_+$/g,
          ''
        );


    const fileName =
      `retailer-sales-report_${location}_${data.dateFrom}_to_${data.dateTo}.xlsx`;


    // ============================================================
    // DOWNLOAD
    // ============================================================

    XLSX.writeFile(
      workbook,
      fileName
    );
  }
}