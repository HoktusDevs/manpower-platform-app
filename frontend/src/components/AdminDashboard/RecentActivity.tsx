import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { CustomSelect, Container, Typography, EmptyState, Flex, Loading } from '../../core-ui';
import type { SelectOption } from '../../core-ui';

type ActivityFilter = 'postulaciones' | 'usuarios' | 'sistema';
type TimeGranularity = 'daily' | 'weekly' | 'quarterly';

interface ActivityData {
  date: string;
  count: number;
  type: ActivityFilter;
  details?: string;
  period?: string; // Para mostrar etiquetas como "S1", "Q1", etc.
}

const ACTIVITY_FILTER_OPTIONS: readonly SelectOption<ActivityFilter>[] = [
  { value: 'postulaciones', label: 'Aplicaciones recientes', description: 'Solo actividad de postulaciones' },
  { value: 'usuarios', label: 'Formulario actualizado', description: 'Solo actividad de formularios' },
  { value: 'sistema', label: 'Postulante pendiente de revisión', description: 'Solo postulantes pendientes' }
] as const;

const TIME_GRANULARITY_OPTIONS: readonly SelectOption<TimeGranularity>[] = [
  { value: 'daily', label: 'Diario', description: 'Ver por días de la semana' },
  { value: 'weekly', label: 'Semanal', description: 'Ver por semanas del mes' },
  { value: 'quarterly', label: 'Cuatrimestral', description: 'Ver por cuatrimestres' }
] as const;

// Generar datos según granularidad temporal
const generateMockData = (filter: ActivityFilter, granularity: TimeGranularity): ActivityData[] => {
  if (filter === 'usuarios') {
    // Datos de formularios actualizados según granularidad
    const today = new Date();
    const data: ActivityData[] = [];

    switch (granularity) {
      case 'daily': {
        // Datos diarios (lunes a viernes)
        const currentDay = today.getDay();
        const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
        
        for (let i = 0; i < 5; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - mondayOffset + i);
          const count = Math.floor(Math.random() * 15) + 2; // Entre 2-17 formularios
          
          data.push({
            date: date.toISOString().split('T')[0],
            count,
            type: 'usuarios',
            details: `${count} formularios actualizados`,
            period: date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()
          });
        }
        break;
      }

      case 'weekly': {
        // Datos semanales (4 semanas del mes actual)
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        for (let week = 1; week <= 4; week++) {
          const count = Math.floor(Math.random() * 50) + 10; // Entre 10-60 formularios por semana
          const weekStart = new Date(currentYear, currentMonth, (week - 1) * 7 + 1);
          
          data.push({
            date: weekStart.toISOString().split('T')[0],
            count,
            type: 'usuarios',
            details: `${count} formularios en semana ${week}`,
            period: `S${week}`
          });
        }
        break;
      }

      case 'quarterly': {
        // Datos cuatrimestrales (3 cuatrimestres del año)
        const quarters = [
          { months: [0, 1, 2, 3], label: 'Q1', name: 'Ene-Abr' },
          { months: [4, 5, 6, 7], label: 'Q2', name: 'May-Ago' },
          { months: [8, 9, 10, 11], label: 'Q3', name: 'Sep-Dic' }
        ];
        
        quarters.forEach((quarter) => {
          const count = Math.floor(Math.random() * 200) + 50; // Entre 50-250 formularios por cuatrimestre
          const quarterStart = new Date(today.getFullYear(), quarter.months[0], 1);
          
          data.push({
            date: quarterStart.toISOString().split('T')[0],
            count,
            type: 'usuarios',
            details: `${count} formularios en ${quarter.name}`,
            period: quarter.label
          });
        });
        break;
      }
    }

    return data;
  }

  if (filter !== 'postulaciones') {
    // Datos mock simples para sistema (pendientes de revisión)
    const mockData: ActivityData[] = [
      { date: '2025-01-13', count: 5, type: 'sistema', details: 'Pendientes de revisión' },
      { date: '2025-01-12', count: 3, type: 'sistema', details: 'En proceso de validación' }
    ];
    return mockData.filter(item => item.type === filter);
  }

  const today = new Date();
  const data: ActivityData[] = [];

  switch (granularity) {
    case 'daily': {
      // Datos diarios (lunes a viernes)
      const currentDay = today.getDay();
      const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
      
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - mondayOffset + i);
        const count = Math.floor(Math.random() * 20) + 5;
        
        data.push({
          date: date.toISOString().split('T')[0],
          count,
          type: 'postulaciones',
          details: `${count} aplicaciones recibidas`,
          period: date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()
        });
      }
      break;
    }

    case 'weekly': {
      // Datos semanales (4 semanas del mes actual)
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      for (let week = 1; week <= 4; week++) {
        const count = Math.floor(Math.random() * 80) + 20; // Entre 20-100 aplicaciones por semana
        const weekStart = new Date(currentYear, currentMonth, (week - 1) * 7 + 1);
        
        data.push({
          date: weekStart.toISOString().split('T')[0],
          count,
          type: 'postulaciones',
          details: `${count} aplicaciones en semana ${week}`,
          period: `S${week}`
        });
      }
      break;
    }

    case 'quarterly': {
      // Datos cuatrimestrales (3 cuatrimestres del año)
      const quarters = [
        { months: [0, 1, 2, 3], label: 'Q1', name: 'Ene-Abr' },
        { months: [4, 5, 6, 7], label: 'Q2', name: 'May-Ago' },
        { months: [8, 9, 10, 11], label: 'Q3', name: 'Sep-Dic' }
      ];
      
      quarters.forEach((quarter) => {
        const count = Math.floor(Math.random() * 300) + 100; // Entre 100-400 aplicaciones por cuatrimestre
        const quarterStart = new Date(today.getFullYear(), quarter.months[0], 1);
        
        data.push({
          date: quarterStart.toISOString().split('T')[0],
          count,
          type: 'postulaciones',
          details: `${count} aplicaciones en ${quarter.name}`,
          period: quarter.label
        });
      });
      break;
    }
  }

  return data;
};

// Placeholder para datos reales - conectar con AWS/API
const fetchActivityData = async (filter: ActivityFilter, granularity: TimeGranularity = 'daily'): Promise<ActivityData[]> => {
  // TODO: Reemplazar con llamada real a AWS/API
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simular carga
  
  return generateMockData(filter, granularity);
};

const UniversalChart = ({ data, granularity, filter }: { data: ActivityData[], granularity: TimeGranularity, filter: ActivityFilter }) => {
  const maxCount = Math.max(...data.map(item => item.count));
  const chartHeight = 200;
  
  const getXAxisLabel = () => {
    switch (granularity) {
      case 'daily': return 'Días de la semana';
      case 'weekly': return 'Semanas del mes';
      case 'quarterly': return 'Cuatrimestres del año';
      default: return 'Período';
    }
  };

  const getYAxisLabel = () => {
    switch (filter) {
      case 'postulaciones': return 'Nº de Postulaciones';
      case 'usuarios': return 'Nº de Formularios';
      case 'sistema': return 'Nº de Pendientes';
      default: return 'Cantidad';
    }
  };

  const getBarColor = () => {
    switch (filter) {
      case 'postulaciones': return 'from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500';
      case 'usuarios': return 'from-green-600 to-green-400 hover:from-green-700 hover:to-green-500';
      case 'sistema': return 'from-amber-600 to-amber-400 hover:from-amber-700 hover:to-amber-500';
      default: return 'from-gray-600 to-gray-400 hover:from-gray-700 hover:to-gray-500';
    }
  };

  return (
    <div className="p-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex">
          {/* Y-axis label (vertical) */}
          <div className="flex items-center mr-4">
            <div 
              className="text-xs text-gray-600 font-medium whitespace-nowrap"
              style={{ 
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)'
              }}
            >
              {getYAxisLabel()}
            </div>
          </div>
          
          {/* Chart Container */}
          <div className="flex-1">
            <div className="flex items-end justify-center gap-6" style={{ height: chartHeight + 40 }}>
              {data.map((item, index) => {
                const barHeight = (item.count / maxCount) * chartHeight;
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    {/* Y-axis value on top */}
                    <div className="mb-2 text-xs font-semibold text-gray-700 h-4">
                      {barHeight > 20 ? item.count : ''}
                    </div>
                    
                    {/* Bar */}
                    <div 
                      className={`bg-gradient-to-t rounded-t-md transition-all duration-700 ease-out relative group cursor-pointer ${getBarColor()}`}
                      style={{ 
                        height: `${barHeight}px`,
                        minHeight: '4px',
                        width: '48px'
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        {item.details}
                      </div>
                      
                      {/* Value inside short bars */}
                      {barHeight <= 20 && (
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700">
                          {item.count}
                        </div>
                      )}
                    </div>
                    
                    {/* X-axis period label */}
                    <div className="mt-3 text-xs font-medium text-gray-600">
                      {item.period || 'N/A'}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* X-axis label */}
            <div className="mt-4 text-center">
              <span className="text-xs text-gray-600 font-medium">{getXAxisLabel()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartSkeleton = ({ granularity, filter }: { granularity: TimeGranularity, filter: ActivityFilter }) => {
  const chartHeight = 200;
  
  // Determinar número de barras según granularidad
  const barsCount = granularity === 'daily' ? 5 : granularity === 'weekly' ? 4 : 3;
  
  const getXAxisLabel = () => {
    switch (granularity) {
      case 'daily': return 'Días de la semana';
      case 'weekly': return 'Semanas del mes';
      case 'quarterly': return 'Cuatrimestres del año';
      default: return 'Período';
    }
  };

  const getYAxisLabel = () => {
    switch (filter) {
      case 'postulaciones': return 'Nº de Postulaciones';
      case 'usuarios': return 'Nº de Formularios';
      case 'sistema': return 'Nº de Pendientes';
      default: return 'Cantidad';
    }
  };

  return (
    <div className="p-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex">
          {/* Y-axis label skeleton */}
          <div className="flex items-center mr-4">
            <div 
              className="text-xs text-gray-400 font-medium whitespace-nowrap"
              style={{ 
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)'
              }}
            >
              {getYAxisLabel()}
            </div>
          </div>
          
          {/* Chart Container */}
          <div className="flex-1">
            <div className="flex items-end justify-center gap-6" style={{ height: chartHeight + 40 }}>
              {Array.from({ length: barsCount }, (_, index) => {
                // Alturas aleatorias para el skeleton
                const skeletonHeight = Math.floor(Math.random() * 120) + 40; // Entre 40-160px
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    {/* Value skeleton on top */}
                    <div className="mb-2 h-4 w-6 bg-gray-300 rounded animate-pulse"></div>
                    
                    {/* Bar skeleton */}
                    <div 
                      className="bg-gray-300 rounded-t-md animate-pulse"
                      style={{ 
                        height: `${skeletonHeight}px`,
                        width: '48px'
                      }}
                    />
                    
                    {/* X-axis label skeleton */}
                    <div className="mt-3 h-3 w-8 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                );
              })}
            </div>
            
            {/* X-axis label */}
            <div className="mt-4 text-center">
              <span className="text-xs text-gray-400 font-medium">{getXAxisLabel()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityChart = ({ data, filter, granularity }: { data: ActivityData[], filter: ActivityFilter, granularity: TimeGranularity }) => {
  if (data.length === 0) {
    return (
      <EmptyState
        title="Sin actividad reciente"
        message={`No hay actividad de ${filter} para mostrar en este momento.`}
        iconName="activity"
        showContainer={false}
        className="py-8"
      />
    );
  }

  // Mostrar gráfico universal para aplicaciones y formularios
  if (filter === 'postulaciones' || filter === 'usuarios') {
    return <UniversalChart data={data} granularity={granularity} filter={filter} />;
  }

  // TODO: Implementar gráfico para sistema (pendientes)
  return (
    <div className="p-6">
      <div className="text-center text-gray-500 py-12">
        <div className="text-sm">
          Gráfico para "{ACTIVITY_FILTER_OPTIONS.find(opt => opt.value === filter)?.label}" próximamente
        </div>
      </div>
    </div>
  );
};

export function RecentActivity(): ReactNode {
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<ActivityFilter>('postulaciones');
  const [selectedGranularity, setSelectedGranularity] = useState<TimeGranularity>('daily');
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos cuando cambia el filtro o granularidad
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchActivityData(selectedActivityFilter, selectedGranularity);
        setActivityData(data);
      } catch (error) {
        console.error('Error loading activity data:', error);
        setActivityData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedActivityFilter, selectedGranularity]);

  const handleActivityFilterChange = (newFilter: ActivityFilter): void => {
    setSelectedActivityFilter(newFilter);
  };

  const handleGranularityChange = (newGranularity: TimeGranularity): void => {
    setSelectedGranularity(newGranularity);
  };

  return (
    <Container variant="surface" padding="none">
      <div className="p-6 border-b">
        <Flex align="center" justify="between">
          <Typography variant="h4">Actividad Reciente</Typography>
          
          <div className="flex gap-3">
            <CustomSelect
              value={selectedActivityFilter}
              options={ACTIVITY_FILTER_OPTIONS}
              onChange={handleActivityFilterChange}
              className="min-w-64"
            />
            
            {(selectedActivityFilter === 'postulaciones' || selectedActivityFilter === 'usuarios') && (
              <CustomSelect
                value={selectedGranularity}
                options={TIME_GRANULARITY_OPTIONS}
                onChange={handleGranularityChange}
                className="min-w-36"
              />
            )}
          </div>
        </Flex>
      </div>
      
      {isLoading ? (
        (selectedActivityFilter === 'postulaciones' || selectedActivityFilter === 'usuarios') ? (
          <ChartSkeleton granularity={selectedGranularity} filter={selectedActivityFilter} />
        ) : (
          <div className="p-8 flex justify-center">
            <Loading size="md" />
          </div>
        )
      ) : (
        <ActivityChart data={activityData} filter={selectedActivityFilter} granularity={selectedGranularity} />
      )}
    </Container>
  );
}

export default RecentActivity;