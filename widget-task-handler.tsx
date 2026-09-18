import React from 'react';
import { registerWidgetTaskHandler, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { RemedioWidgetAndroid } from './src/widget/RemedioWidget.android';

export async function widgetTaskHandler({ renderWidget, widgetAction }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE' || widgetAction === 'WIDGET_RESIZED') {
    renderWidget(<RemedioWidgetAndroid />);
  }
}

export { registerWidgetTaskHandler };
