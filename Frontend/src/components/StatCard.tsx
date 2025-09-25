
import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  iconBgColor: string;
  textColor?: string;
  arrowIcon?: ReactNode;
}

const StatCard = ({ title, value, icon, iconBgColor, textColor = 'text-gray-900', arrowIcon }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 flex flex-col shadow-lg border border-gray-100 relative overflow-hidden transform hover:scale-105 hover:shadow-xl transition-all duration-300 group">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-indigo-50 to-blue-50 rounded-full -ml-8 -mb-8 opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
      
      <div className="relative z-10">
        <div className={`${iconBgColor} p-3 rounded-xl inline-block shadow-sm group-hover:shadow-md transition-shadow duration-300`}>
          {icon}
        </div>
        
        <h3 className="text-sm font-medium text-gray-600 mt-4 group-hover:text-gray-700 transition-colors duration-200">{title}</h3>
        <p className={`text-4xl font-bold mt-2 ${textColor} group-hover:scale-105 transition-transform duration-200`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>

        {arrowIcon && (
          <div className="absolute bottom-4 right-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-200">
            {arrowIcon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
