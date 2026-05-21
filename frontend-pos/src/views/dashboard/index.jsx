import { useState, useEffect } from 'react';
import LayoutAdmin from '../../layouts/admin';
import Api from '../../service/api';
import Cookies from 'js-cookie';
import moneyFormat from '../../utils/moneyFormat';
import ApexCharts from "apexcharts";
import generateRandomColors from '../../utils/generateRandomColors';
import { getImageUrl } from '../../utils/getImageUrl';

const commonChartOptions = {
    fontFamily: 'inherit',
    animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
            speed: 450
        }
    },
    dataLabels: { enabled: false },
    grid: { show: false },
    tooltip: { theme: 'dark' },
    xaxis: {
        labels: { show: false },
        tooltip: { enabled: false },
        axisBorder: { show: false },
        type: 'category',
    },
    yaxis: { labels: { show: false } },
    colors: ['#206bc4'],
    legend: { show: false },
    markers: { size: 0 },
};

export default function Dashboard() {

    //state dashboard data
    const [dashboardData, setDashboardData] = useState({
        countSalestoday: 0,
        sumSalestoday: 0,
        sumSalesWeek: 0,
        salesDate: [],
        salesTotal: [],
        sumProfitsToday: 0,
        sumProfitsWeek: 0,
        profitsDate: [],
        profitsTotal: [],
        productsBestSelling: [],
        productsLimitStock: []
    });

    const fetchData = async () => {
        const token = Cookies.get("token");

        if (token) {
            Api.defaults.headers.common["Authorization"] = token;

            try {
                const response = await Api.get("/api/dashboard");
                const resData = response.data.data;

                setDashboardData({
                    countSalestoday: resData.count_sales_today || 0,
                    sumSalestoday: resData.sum_sales_today || 0,
                    sumSalesWeek: resData.sum_sales_week || 0,
                    salesDate: resData.sales?.sales_date || [],
                    salesTotal: resData.sales?.sales_total || [],
                    sumProfitsToday: resData.sum_profits_today || 0,
                    sumProfitsWeek: resData.sum_profits_week || 0,
                    profitsDate: resData.profits?.profits_date || [],
                    profitsTotal: resData.profits?.profits_total || [],
                    productsBestSelling: resData.best_selling_products || [],
                    productsLimitStock: resData.products_limit_stock || [],
                });

            } catch (error) {
                console.error("There was an error fetching the data!", error);
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const initializeChart = (elementId, charOptions) => {
        const element = document.getElementById(elementId);
        if (!element) return null;
        const chart = new ApexCharts(element, charOptions);
        chart.render();
        return chart;
    };

    useEffect(() => {
        if (dashboardData.salesDate.length === 0) return;

        // Sales Chart
        const salesChart = initializeChart('chart-sales', {
            ...commonChartOptions,
            chart: {
                type: "area",
                height: 40,
                sparkline: { enabled: true },
                toolbar: { show: false }
            },
            fill: { opacity: .16, type: 'solid' },
            stroke: { width: 2, lineCap: "round", curve: "smooth" },
            series: [{
                name: "Sales",
                data: dashboardData.salesTotal,
            }],
            labels: dashboardData.salesDate,
        });

        // Profits Chart
        const profitsChart = initializeChart('chart-profits', {
            ...commonChartOptions,
            chart: {
                type: "bar",
                height: 40,
                sparkline: { enabled: true },
                toolbar: { show: false }
            },
            plotOptions: { bar: { columnWidth: '50%' } },
            series: [{
                name: "Profits",
                data: dashboardData.profitsTotal,
            }],
            labels: dashboardData.profitsDate,
        });

        // Best Selling Chart
        const seriesData = dashboardData.productsBestSelling.map(product => product.total);
        const labelsData = dashboardData.productsBestSelling.map(product => product.title);

        const bestProductsChart = initializeChart('chart-best-products', {
            chart: {
                type: 'pie',
                height: 350
            },
            series: seriesData,
            labels: labelsData,
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: { width: 200 },
                    legend: { position: 'bottom' }
                }
            }],
            colors: generateRandomColors(dashboardData.productsBestSelling.length),
            legend: { position: 'bottom' },
            tooltip: {
                y: { formatter: (val) => `${val}` }
            }
        });

        return () => {
            if (salesChart) salesChart.destroy();
            if (profitsChart) profitsChart.destroy();
            if (bestProductsChart) bestProductsChart.destroy();
        };
    }, [dashboardData]);

    return (
        <LayoutAdmin>
            <div className="page-header d-print-none">
                <div className="container-xl">
                    <div className="row g-2 align-items-center">
                        <div className="col">
                            <div className="page-pretitle">
                                HALAMAN
                            </div>
                            <h2 className="page-title">
                                DASHBOARD
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
            <div className="page-body">
                <div className="container-xl">
                    <div className="row row-deck row-cards">
                        <div className="col-sm-6 col-lg-3">
                            <div className="card rounded card-link card-link-pop">
                                <div className="card-body">
                                    <div className="d-flex align-items-center">
                                        <div className="subheader">Sales Today</div>
                                    </div>
                                    <div className="h1 mb-2">{dashboardData.countSalestoday}</div>
                                    <hr className='mb-2 mt-1' />
                                    <div className="h1 mb-0 me-2">{moneyFormat(dashboardData.sumSalestoday)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6 col-lg-3">
                            <div className="card rounded card-link card-link-pop">
                                <div className="card-body">
                                    <div className="d-flex align-items-center ">
                                        <div className="subheader">Profits Today</div>
                                    </div>
                                    <div className="h1 mb-0 me-2 mt-4">{moneyFormat(dashboardData.sumProfitsToday)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6 col-lg-3">
                            <div className="card rounded card-link card-link-pop">
                                <div className="card-body">
                                    <div className="d-flex align-items-center">
                                        <div className="subheader">SALES</div>
                                        <div className="ms-auto lh-1">
                                            <span className="text-end active">Last 7 days</span>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-baseline">
                                        <div className="h1 mb-0 me-2">{moneyFormat(dashboardData.sumSalesWeek)}</div>
                                    </div>
                                </div>
                                <div id="chart-sales" className="chart-sm"></div>
                            </div>
                        </div>
                        <div className="col-sm-6 col-lg-3">
                            <div className="card rounded card-link card-link-pop">
                                <div className="card-body">
                                    <div className="d-flex align-items-center">
                                        <div className="subheader">PROFITS</div>
                                        <div className="ms-auto lh-1">
                                            <span className="text-end active">Last 7 days</span>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-baseline">
                                        <div className="h1 mb-3 me-2">{moneyFormat(dashboardData.sumProfitsWeek)}</div>
                                    </div>
                                    <div id="chart-profits" className="chart-sm"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='row mt-5'>
                        <div className="col-md-8">
                            <div className='card rounded'>
                                <div className='card-header p-3'>
                                    <h3 className='mb-0'>
                                        PRODUCTS BEST SELLING
                                    </h3>
                                </div>
                                <div className="card-body">
                                    <div id="chart-best-products"></div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className='card rounded'>
                                <div className='card-header p-3'>
                                    <h3 className='mb-0'>
                                        PRODUCTS LIMIT STOCK
                                    </h3>
                                </div>
                                <div className="card-body scrollable-card-body">
                                    <div className="row">
                                        {dashboardData.productsLimitStock.map((product) => (
                                            <div className='col-12 mb-2' key={product.id}>
                                                <div className="card rounded">
                                                    <div className="card-body d-flex align-items-center">
                                                        <img
                                                            src={getImageUrl(product.image)}
                                                            alt={product.title}
                                                            width={50}
                                                            height={50}
                                                            className="me-3"
                                                        />
                                                        <div className="flex-fill">
                                                            <h4 className="mb-0">{product.title}</h4>
                                                            <hr className="mb-1 mt-1" />
                                                            {product.stock === 0 ? (
                                                                <span className="badge bg-danger">Stok produk kosong</span>
                                                            ) : product.stock < 5 ? (
                                                                <span className="badge bg-warning text-white">Stok produk menipis ({product.stock})</span>
                                                            ) : (
                                                                <span className="badge bg-secondary-lt">Stok: {product.stock}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LayoutAdmin>
    )
}