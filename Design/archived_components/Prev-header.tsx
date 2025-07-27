<div className="relative overflow-hidden rounded-2xl glass-card">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
                    <div className="relative p-6 md:p-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            {/* Left side - User Info */}
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16 ring-2 ring-white shadow-md">
                                    <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                                    <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                        {getInitials(userProfile?.name || 'User')}
                                    </AvatarFallback>
                                </Avatar>
                                
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h1 className="glass-text-title font-bold md:text-3xl">
                                            {getCurrentTimeGreeting()}, {userProfile?.name?.split(' ')[0] || 'User'}!
                                        </h1>
                                        <Sparkles className="h-5 w-5 text-yellow-500" />
                                    </div>
                                    <p className="glass-text-description">Ready to learn something new today?</p>
                                </div>
                            </div>

                            {/* Right side - Plan Status & Actions */}
                            <div className="flex items-center gap-3">
                                {/* Plan Badge */}
                                <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-white/50 shadow-sm">
                                    {billingLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 bg-gray-300 rounded-full animate-pulse"></div>
                                            <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
                                        </div>
                                    ) : (
                                        <>
                                            <Crown className={`h-4 w-4 ${
                                                subscription?.plan_id && subscription.plan_id !== 'free' 
                                                    ? 'text-yellow-500' 
                                                    : 'text-gray-400'
                                            }`} />
                                            <span className="text-sm font-medium text-gray-900">
                                                {subscription ? getPlanDisplayName(subscription.plan_id) : 'Free Plan'}
                                            </span>
                                            {subscription && (
                                                <Badge 
                                                    className={`${getStatusColor(subscription.status)} text-xs`}
                                                    variant="secondary"
                                                >
                                                    {getStatusLabel(subscription.status)}
                                                </Badge>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Notifications */}
                                <NotificationButton />

                                {/* Actions */}
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleLogout}
                                    className="bg-white/50 backdrop-blur-sm hover:bg-white/70 border border-white/50"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign out
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-gradient-to-tr from-purple-400/20 to-pink-400/20 blur-xl"></div>
                </div>